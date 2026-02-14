import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  saveUserPreferences,
  editUserPreferences,
  addEnjoyedRestaurants,
  removeEnjoyedRestaurants,
  fetchEnjoyedRestaurantsWithSearchQuery,
  viewProfile,
  searchPlaces,
  addRating,
  fetchUserRecommendations,
  fetchScanInfo,
} from '../controllers/user.controllers.js';
import { upload } from '../utils/utils.multer.js';

const router = Router();

router.use(requireAuth);

router.get('/profile', viewProfile);
router.post('/preferences', saveUserPreferences);
router.patch('/preferences', editUserPreferences);
router.get('/enjoyed', fetchEnjoyedRestaurantsWithSearchQuery);
router.post('/enjoyed', addEnjoyedRestaurants);
router.delete('/enjoyed', removeEnjoyedRestaurants);
router.get('/places', searchPlaces);
router.post('/rating', addRating);
router.get('/recommendations', fetchUserRecommendations);
router.get('/scanInfo', upload.single('photo'), fetchScanInfo);

export default router;
