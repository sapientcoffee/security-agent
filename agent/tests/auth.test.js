import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken } from '../src/middleware/auth.js';
import { admin } from '../src/lib/firebase.js';
import { OAuth2Client } from 'google-auth-library';

const mocks = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  googleVerifyIdTokenMock: vi.fn()
}));

vi.mock('../src/lib/firebase.js', () => ({
  admin: {
    auth: vi.fn(() => ({
      verifyIdToken: mocks.verifyIdTokenMock
    }))
  }
}));

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: mocks.googleVerifyIdTokenMock
    }))
  };
});

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

  it('should call next with a 401 error if both Firebase and Google verification fail', async () => {
    req.headers.authorization = 'Bearer InvalidToken';
    mocks.verifyIdTokenMock.mockRejectedValueOnce(new Error('Invalid Firebase token'));
    mocks.googleVerifyIdTokenMock.mockRejectedValueOnce(new Error('Invalid Google token'));
    
    await verifyToken(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    expect(mocks.verifyIdTokenMock).toHaveBeenCalledWith('InvalidToken');
    expect(mocks.googleVerifyIdTokenMock).toHaveBeenCalledWith({ idToken: 'InvalidToken' });
  });

  it('should attach decoded payload to req.user and call next() on Firebase success', async () => {
    req.headers.authorization = 'Bearer ValidFirebaseToken';
    const decodedToken = { uid: '123', email: 'test@example.com' };
    mocks.verifyIdTokenMock.mockResolvedValueOnce(decodedToken);
    
    await verifyToken(req, res, next);
    
    expect(req.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalledWith(); // Called without arguments
    expect(mocks.verifyIdTokenMock).toHaveBeenCalledWith('ValidFirebaseToken');
    expect(mocks.googleVerifyIdTokenMock).not.toHaveBeenCalled();
  });

  it('should attach decoded payload to req.user and call next() on Google OIDC success if Firebase fails', async () => {
    req.headers.authorization = 'Bearer ValidGoogleToken';
    mocks.verifyIdTokenMock.mockRejectedValueOnce(new Error('Not a Firebase token'));
    
    const payload = { sub: '456', email: 'google@example.com' };
    mocks.googleVerifyIdTokenMock.mockResolvedValueOnce({
      getPayload: vi.fn().mockReturnValue(payload)
    });
    
    await verifyToken(req, res, next);
    
    expect(req.user).toEqual({ ...payload, uid: '456' });
    expect(next).toHaveBeenCalledWith(); // Called without arguments
    expect(mocks.verifyIdTokenMock).toHaveBeenCalledWith('ValidGoogleToken');
    expect(mocks.googleVerifyIdTokenMock).toHaveBeenCalledWith({ idToken: 'ValidGoogleToken' });
  });
});