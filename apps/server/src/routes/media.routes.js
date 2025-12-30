import { Router } from 'express';
import { mediaController } from '../controllers/media.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes - anyone can view uploads
router.get('/menu-item/:menuItemId', mediaController.getByMenuItem);
router.get('/user/:userId', authMiddleware, mediaController.getByUser);
//router.get('/:uploadId', mediaController.getById);

//router.get('/getVotes/:userid', mediaController.getVotes);
//router.post('/upvote/:uploadId/:userid', mediaController.upvote);
//router.post('/downvote/:uploadId/:userid', mediaController.downvote);
//router.delete('/removeupvote/:uploadId/:userid', mediaController.removeUpvote);
//router.delete('/removedownvote/:uploadId/:userid', mediaController.removeDownvote);



// Protected routes - require authentication
router.post(
  '/validate-generic',
  authMiddleware,
  upload.single('image'),
  mediaController.validateGeneric
);

router.post(
  '/upload',
  authMiddleware,
  upload.single('image'),
  mediaController.uploadImage
);

router.delete('/:uploadId', authMiddleware, mediaController.deleteUpload);


router.get('/getVotes', authMiddleware, mediaController.getVotes);
router.post('/upvote/:uploadId/', authMiddleware, mediaController.upvote);
router.post('/downvote/:uploadId/', authMiddleware, mediaController.downvote);
router.delete('/removeupvote/:uploadId/', authMiddleware, mediaController.removeUpvote);
router.delete('/removedownvote/:uploadId/', authMiddleware, mediaController.removeDownvote);

router.get('/skip-onboarding', authMiddleware, mediaController.getSkipOnboarding);
router.post('/skip-onboarding', authMiddleware, mediaController.setSkipOnboarding);

// Get current user's uploads
router.get('/my-uploads', authMiddleware, mediaController.getMyUploads);


export default router;
