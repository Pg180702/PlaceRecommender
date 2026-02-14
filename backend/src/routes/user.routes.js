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
} from '../controllers/user.controllers.js';

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

export default router;
