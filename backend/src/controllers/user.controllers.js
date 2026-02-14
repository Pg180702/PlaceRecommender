import { Place } from '../models/places.models.js';
import { Rating } from '../models/ratings.models.js';
import { buildFingerPrint } from '../utils/utils.aiBuilder.js';

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

    const user = req.user;

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

    const user = req.user;

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

    const user = req.user;

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

    const user = req.user;

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

export const fetchEnjoyedRestaurantsWithSearchQuery = async (req, res) => {
  try {
    const pageNo = Math.max(0, parseInt(req.query.pageNo) || 0);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 20),
    );
    const searchQuery = (req.query.searchQuery || '').trim();

    const user = req.user;

    if (!user.enjoyedRestaurants?.length) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          totalRecords: 0,
          currentPage: pageNo,
          totalPages: 0,
          pageSize,
        },
      });
    }

    const query = {
      _id: { $in: user.enjoyedRestaurants },
      ...(searchQuery && { name: { $regex: searchQuery, $options: 'i' } }),
    };

    const [places, totalCount] = await Promise.all([
      Place.find(query)
        .limit(pageSize)
        .skip(pageNo * pageSize)
        .lean(),
      Place.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: places,
      pagination: {
        totalRecords: totalCount,
        currentPage: pageNo,
        totalPages: Math.ceil(totalCount / pageSize),
        pageSize,
        hasNextPage: (pageNo + 1) * pageSize < totalCount,
        hasPrevPage: pageNo > 0,
      },
    });
  } catch (error) {
    console.error('Error fetching enjoyed restaurants:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enjoyed restaurants',
    });
  }
};

export const viewProfile = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

export const searchPlaces = async (req, res) => {
  try {
    const pageNo = Math.max(0, parseInt(req.query.pageNo) || 0);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 20),
    );
    const searchQuery = (req.query.searchQuery || '').trim();
    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const radiusKm = parseFloat(req.query.radiusKm) || 30;

    const query = {};

    if (!isNaN(lng) && !isNaN(lat)) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      };
    }

    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' };
    }

    const countQuery = { ...query };
    if (countQuery.location?.$near) {
      countQuery.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6378.1],
        },
      };
    }

    const [places, totalCount] = await Promise.all([
      Place.find(query)
        .skip(pageNo * pageSize)
        .limit(pageSize)
        .lean(),
      Place.countDocuments(countQuery),
    ]);

    return res.status(200).json({
      success: true,
      data: places,
      pagination: {
        totalRecords: totalCount,
        currentPage: pageNo,
        totalPages: Math.ceil(totalCount / pageSize),
        pageSize,
        hasNextPage: (pageNo + 1) * pageSize < totalCount,
        hasPrevPage: pageNo > 0,
      },
    });
  } catch (error) {
    console.error('Error searching places:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search places',
    });
  }
};

export const addRating = async (req, res) => {
  try {
    const { placeId, score } = req.body;
    const user = req.user;

    if (!placeId || score == null) {
      return res.status(400).json({
        success: false,
        message: 'placeId and score are required',
      });
    }

    if (score < 1 || score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Score must be between 1 and 5',
      });
    }

    const place = await Place.findById(placeId).lean();
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found',
      });
    }

    const rating = await Rating.findOneAndUpdate(
      { userId: user._id, restaurantId: placeId },
      { score },
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: 'Rating saved',
      data: rating,
    });
  } catch (error) {
    console.error('Error adding rating:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add rating',
    });
  }
};

// Finish fingerprint builder
// Add monthly runner for places
// Finish photoscanner and recommender apis and logic
