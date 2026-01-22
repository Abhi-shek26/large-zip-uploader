import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import express from 'express';
import * as UploadController from '../controllers/uploads';

const router = Router();

const wrap = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/handshake', wrap(UploadController.handshake));
router.post('/:uploadId/finalize', wrap(UploadController.finalize));
router.get('/:uploadId/status', wrap(UploadController.status));

router.put(
  '/:uploadId/chunk', 
  express.raw({ type: 'application/octet-stream', limit: '10mb' }), 
  wrap(UploadController.uploadChunk)
);

export default router;
