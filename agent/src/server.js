import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAgentCard } from "./agent-card.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Verbose request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`\n[${new Date().toISOString()}] [${requestId}] >>> REQUEST ${req.method} ${req.url}`);
  console.log(`[${requestId}] Headers:`, JSON.stringify(req.headers, null, 2));
  
  if (req.method === 'POST' && req.body) {
    console.log(`[${requestId}] Request Body:`, JSON.stringify(req.body, null, 2));
  }

  // Capture response body for verbose logging
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = (...args) => {
    chunks.push(Buffer.from(args[0]));
    return oldWrite.apply(res, args);
  };

  res.end = (...args) => {
    if (args[0]) {
      chunks.push(Buffer.from(args[0]));
    }
    const body = Buffer.concat(chunks).toString('utf8');
    const duration = Date.now() - start;
    
    console.log(`[${requestId}] <<< RESPONSE Status: ${res.statusCode} (${duration}ms)`);
    console.log(`[${requestId}] Response Body:`, body);
    console.log(`[${new Date().toISOString()}] [${requestId}] END\n`);
    
    return oldEnd.apply(res, args);
  };

  next();
});

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("[ERROR] Missing GOOGLE_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(API_KEY);

app.get("/agent-card", (req, res) => {
  // Construct absolute base URL, ensuring HTTPS if behind a proxy like Cloud Run
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  
  console.log(`[DEBUG] Generating agent card with baseUrl: ${baseUrl}`);
  res.json(getAgentCard(baseUrl));
});

app.post("/v1/message:send", async (req, res) => {
  try {
    const { message, text } = req.body;
    let input = "";

    if (text) {
      input = text;
    } else if (message?.content && Array.isArray(message.content)) {
      input = message.content.map(part => part.text || "").join("\n");
    } else {
      input = message?.content || message?.text || "";
    }
    
    if (!input || input === "[object Object]") {
      console.warn("[WARN] Missing or invalid input content in request body");
      if (typeof message?.content === 'object' && message.content !== null) {
        input = JSON.stringify(message.content);
      }
    }

    if (!API_KEY) {
      return res.status(500).json({ error: "GOOGLE_API_KEY is not configured" });
    }

    console.log("[INFO] Calling Google AI Studio with gemini-3-flash-preview...");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: "You are a specialized QA and Security Engineer. Your goal is to ensure the provided code is perfectly functional and secure. Instructions: 1. Assess Alignment. 2. Bug Hunting. 3. Security Audit. 4. Output Format: actionable audit report."
    });

    const result = await model.generateContent(input);

    const response = await result.response;
    const responseText = response.text();

    // Finalized A2A compliant response schema for Gemini CLI
    res.json({ 
      message: {
        messageId: req.body.message?.messageId || Math.random().toString(36).substring(7),
        role: "ROLE_AGENT",
        content: [
          {
            text: responseText
          }
        ]
      }
    });
  } catch (error) {
    console.error("[ERROR] Execution error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message, stack: error.stack });
  }
});

app.listen(PORT, () => {
  console.log(`Security Audit Agent listening on port ${PORT}`);
});

