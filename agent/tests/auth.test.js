import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken } from '../src/middleware/auth.js';
import { admin } from '../src/lib/firebase.js';

vi.mock('../src/lib/firebase.js', () => ({
  admin: {
    auth: vi.fn(() => ({
      verifyIdToken: vi.fn()
    }))
  }
}));

describe('verifyToken Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should call next with a 401 error if authorization header is missing', async () => {
    await verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('should call next with a 401 error if authorization format is invalid', async () => {
    req.headers.authorization = 'InvalidFormat TokenHere';
    
    await verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('should call next with a 401 error if verifyIdToken fails', async () => {
    req.headers.authorization = 'Bearer InvalidToken';
    const verifyIdTokenMock = admin.auth().verifyIdToken;
    verifyIdTokenMock.mockRejectedValueOnce(new Error('Invalid token'));
    
    await verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    expect(verifyIdTokenMock).toHaveBeenCalledWith('InvalidToken');
  });

  it('should attach decoded payload to req.user and call next() on success', async () => {
    req.headers.authorization = 'Bearer ValidToken';
    const decodedToken = { uid: '123', email: 'test@example.com' };
    const verifyIdTokenMock = admin.auth().verifyIdToken;
    verifyIdTokenMock.mockResolvedValueOnce(decodedToken);
    
    await verifyToken(req, res, next);
    
    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalledWith(); // Called without arguments
    expect(verifyIdTokenMock).toHaveBeenCalledWith('ValidToken');
  });
});
