import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getUserPreferences,
  upsertUserPreferences,
  addEnjoyedRestaurants,
  removeEnjoyedRestaurants,
  fetchEnjoyedRestaurantsWithSearchQuery,
  viewProfile,
  searchPlaces,
  fetchUserRecommendations,
  fetchScanInfo,
  fetchLastRecommendationsForUser,
  getUserStats,
} from '../controllers/user.controllers.js';
import { upload } from '../utils/utils.multer.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', viewProfile);
router.get('/preferences', getUserPreferences);
router.put('/preferences', upsertUserPreferences);
router.get('/stats', getUserStats);
router.get('/enjoyed', fetchEnjoyedRestaurantsWithSearchQuery);
router.post('/enjoyed', addEnjoyedRestaurants);
router.delete('/enjoyed', removeEnjoyedRestaurants);
router.get('/places', searchPlaces);
router.get('/recommendations', fetchUserRecommendations);
router.post('/scanInfo', upload.single('photo'), fetchScanInfo);
router.get('/fetchPastUserRecommendations', fetchLastRecommendationsForUser);

export default router;
