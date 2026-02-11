import { buildFingerPrint } from '../utils/utils.aiBuilder';

export const saveUserPreferences = async (req, res) => {
  try {
    const {
      cuisines,
      spiceLevel,
      priceRange,
      ambiance,
      mealOccasion,
      dietRestrictions,
    } = req.body;

    if (!cuisines?.length || !mealOccasion) {
      return res.status(400).json({
        success: false,
        message: 'Cuisines and meal occasion are required',
      });
    }

    const user = req.auth.userId; // replace with actual user fetch from mongo

    user.preferences = {
      cuisines,
      spiceLevel: spiceLevel || 3,
      priceRange: priceRange || 'mid',
      dietRestrictions: dietRestrictions || [],
      ambiance: ambiance || [],
      mealOccasion,
    };

    await user.save();

    return res.json({ success: true, message: 'Preferences saved' });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to save preferences' });
  }
};

export const editUserPreferences = async (req, res) => {
  try {
    const updates = req.body;

    const user = req.auth.userId; // replace with actual user fetch from mongo

    if (!user.preferences) {
      return res.status(400).json({
        success: false,
        message: 'No existing preferences found. Save preferences first.',
      });
    }

    const allowedFields = [
      'cuisines',
      'spiceLevel',
      'priceRange',
      'ambiance',
      'mealOccasion',
      'dietRestrictions',
    ];

    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        user.preferences[key] = updates[key];
      }
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Preferences updated',
      data: user.preferences,
    });
  } catch (error) {
    console.error('Error editing preferences:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to update preferences' });
  }
};

export const addEnjoyedRestaurants = async (req, res) => {
  try {
    const { restaurantIds } = req.body;

    if (!restaurantIds?.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one restaurant is required',
      });
    }

    const user = req.auth.userId; // replace with actual user fetch from mongo

    const newIds = restaurantIds.filter(
      (id) => !user.enjoyedRestaurants.includes(id),
    );
    user.enjoyedRestaurants.push(...newIds);

    await user.save();

    await buildFingerPrint(user);

    return res.json({
      success: true,
      message: `${newIds.length} restaurant(s) added`,
      data: user.enjoyedRestaurants,
    });
  } catch (error) {
    console.error('Error adding enjoyed restaurants:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to add restaurants' });
  }
};

export const removeEnjoyedRestaurants = async (req, res) => {
  try {
    const { restaurantIds } = req.body;

    if (!restaurantIds?.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one restaurant ID is required',
      });
    }

    const user = req.auth.userId; // replace with actual user fetch from mongo

    user.enjoyedRestaurants = user.enjoyedRestaurants.filter(
      (id) => !restaurantIds.includes(id.toString()),
    );

    await user.save();

    await buildFingerPrint(user);

    return res.json({
      success: true,
      message: `Restaurant(s) removed`,
      data: user.enjoyedRestaurants,
    });
  } catch (error) {
    console.error('Error removing enjoyed restaurants:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to remove restaurants' });
  }
};
