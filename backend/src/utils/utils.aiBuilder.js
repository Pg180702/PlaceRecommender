import { Place } from '../models/places.models.js';
import { Rating } from '../models/ratings.models.js';
import { Recommendation } from '../models/recommendations.models.js';
import { User } from '../models/user.models.js';
import { callOpenAi, callOpenAiVision } from '../services/service.openai.js';
import {
  callGooglePlacesApi,
  inferCuisines,
  getPhotoUrl,
} from './utils.placeFetcher.js';

export const buildFingerPrint = async (user) => {
  const enjoyedSummaries = user.enjoyedRestaurants.map((r) => ({
    name: r.name,
    cuisines: r.cuisines,
    priceLevel: r.priceLevel,
    rating: r.rating,
    reviewSnippets: (r.reviews || []).slice(0, 2).map((rev) => rev.text),
  }));

  const prompt = `You are a food preference analyst.

    USER'S EXPLICIT PREFERENCES:
    ${JSON.stringify(user.preferences, null, 2)}

    RESTAURANTS USER ENJOYS:
    ${JSON.stringify(enjoyedSummaries, null, 2)}

    Analyze these and build a taste fingerprint.
    Return ONLY valid JSON (no markdown):
    {
      "cuisineAffinity": { "North Indian": 0.85 },
      "spiceComfort": 4,
      "priceComfort": 1.5,
      "ambianceScores": { "casual": 0.9 },
      "adventureScore": 0.3,
      "keySignals": ["values speed", "comfort food"],
      "fingerprintVector": [0.85, 0.1, 0.7, 0.0, 0.0, 0.8, 0.7, 0.3]
    }

    Rules:
    - cuisineAffinity: only cuisines > 0.2
    - fingerprintVector: EXACTLY 8 numbers (0-1) for [north_indian, south_indian, street_food, italian, chinese, spice, price_sensitivity, adventure]`;

  const fingerprint = await callOpenAi(prompt, true);

  user.tasteFingerprint = fingerprint;
  user.fingerprintStale = false;

  await user.save();
};

export const fetchRecommendations = async (user) => {
  if (!user.tasteFingerprint?.fingerprintVector || user.fingerprintStale) {
    await buildFingerPrint(user);
  }

  const enjoyedIds = user.enjoyedRestaurants.map((r) => r._id);

  const candidates = await Place.find({
    _id: { $nin: enjoyedIds },
  })
    .limit(40)
    .lean();

  const restaurantData = candidates.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    cuisines: r.cuisines,
    priceLevel: r.priceLevel,
    rating: r.rating,
    totalRatings: r.totalRatings,
    reviewSnippets: (r.reviews || []).slice(0, 3).map((rev) => rev.text),
  }));

  const prompt = `You are a restaurant recommendation engine.

      USER TASTE FINGERPRINT:
      ${JSON.stringify(user.tasteFingerprint, null, 2)}

      USER PREFERENCES:
      ${JSON.stringify(user.preferences, null, 2)}

      CANDIDATE RESTAURANTS:
      ${JSON.stringify(restaurantData, null, 2)}

      Score each restaurant 0-100 against user's taste.
      Return ONLY valid JSON array (no markdown), sorted by matchScore descending:
      [
        {
          "id": "exact_id_from_input",
          "matchScore": 78,
          "reasons": ["Matches North Indian preference"],
          "warnings": ["Spicier than usual"],
          "suggestedDish": "Paneer tikka"
        }
      ]

      Only include restaurants with matchScore >= 30.`;

  const scored = await callOpenAi(prompt, true);

  const recommendations = [];

  for (const item of scored.slice(0, 10)) {
    const restaurant = candidates.find((r) => r._id.toString() === item.id);
    if (!restaurant) continue;

    let socialProof = null;
    let adventureNudge = null;

    if (item.matchScore < 55) {
      socialProof = await getSocialProof(user, restaurant._id);

      if (socialProof && socialProof.similarUsersWhoTried >= 2) {
        adventureNudge = `${socialProof.similarUsersWhoTried} people with a taste like yours loved ${restaurant.name} and gave it ${socialProof.averageRating}/5 — might be worth a try!`;
      }
    }

    recommendations.push({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        cuisines: restaurant.cuisines,
        priceLevel: restaurant.priceLevel,
        rating: restaurant.rating,
        totalRatings: restaurant.totalRatings,
        photoUrl: restaurant.photoUrl,
        address: restaurant.address,
      },
      matchScore: item.matchScore,
      reasons: item.reasons,
      warnings: item.warnings,
      suggestedDish: item.suggestedDish,
      socialProof,
      adventureNudge,
    });
  }

  const saved = await Recommendation.create({
    userId: user._id,
    recommendations,
  });

  return saved;
};

const getSocialProof = async (currentUser, restaurantId) => {
  const currentVector = currentUser?.tasteFingerprint?.fingerprintVector;

  if (!currentVector) return null;

  const otherUsers = await User.find({
    _id: { $ne: currentUser._id },
    'tasteFingerprint.fingerprintVector': { $exists: true },
  }).lean();

  const scored = otherUsers
    .map((u) => ({
      _id: u._id,
      similarity: cosineSimilarity(
        currentVector,
        u.tasteFingerprint.fingerprintVector,
      ),
    }))
    .filter((u) => u.similarity > 0.6)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 30);

  if (scored.length === 0) return null;

  const similarUserIds = scored.map((u) => u._id);
  const ratings = await Rating.find({
    userId: { $in: similarUserIds },
    restaurantId,
  }).lean();

  if (ratings.length === 0) return null;

  const avgRating =
    ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;

  return {
    similarUsersWhoTried: ratings.length,
    averageRating: Math.round(avgRating * 10) / 10,
  };
};

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

export const scoreRestaurant = async (user, imageBuffer) => {
  const visionPrompt = `This is a photo of a restaurant storefront.

    Extract:
    - Restaurant name (read carefully)
    - Cuisine type if visible
    - Price indicators if visible

    Return ONLY valid JSON:
    {
      "name": "exact name",
      "cuisineHint": "cuisine or null",
      "priceHint": "budget/mid/upscale or null",
      "confidence": 0.0 to 1.0
    }

    If you cannot clearly read a name, set confidence < 0.7`;

  const extraction = await callOpenAiVision(imageBuffer, visionPrompt);

  if (extraction.confidence < 0.7) {
    return {
      success: false,
      error:
        'Could not clearly read the restaurant name. Please type it manually.',
      extraction,
    };
  }

  let restaurant = await Place.findOne({
    $text: { $search: extraction.name },
  })
    .sort({ score: { $meta: 'textScore' } })
    .lean();

  if (!restaurant) {
    const searchData = await callGooglePlacesApi({
      url: process.env.GOOGLE_TEXT_SEARCH_API,
      method: 'POST',
      data: {
        textQuery: extraction.name,
        locationBias: {
          circle: {
            center: {
              latitude: parseFloat(process.env.CITY_LAT),
              longitude: parseFloat(process.env.CITY_LNG),
            },
            radius: 15000,
          },
        },
      },
      fieldMask: 'places.id',
    });

    const placeId = searchData?.places?.[0]?.id;

    if (!placeId) {
      return {
        success: false,
        error: 'Could not find this restaurant.',
        extraction,
      };
    }

    const details = await callGooglePlacesApi({
      url: `${process.env.GOOGLE_PLACES_API}/places/${placeId}`,
      method: 'GET',
      fieldMask:
        'id,displayName,formattedAddress,location,priceLevel,rating,userRatingCount,types,reviews,photos',
    });

    if (!details) {
      return { success: false, error: 'Could not fetch restaurant details.', extraction };
    }

    const cuisines = inferCuisines(details.types, details.displayName?.text);
    const photoUrl = details.photos?.[0] ? getPhotoUrl(details.photos[0].name) : null;
    const reviews = (details.reviews || []).slice(0, 5).map((r) => ({
      text: r.text?.text || r.text || '',
      rating: r.rating || 0,
      authorName: r.authorAttribution?.displayName || 'Anonymous',
    }));

    restaurant = await Place.create({
      googlePlaceId: placeId,
      name: details.displayName?.text,
      cuisines,
      priceLevel: details.priceLevel ? parsePriceLevel(details.priceLevel) : 0,
      rating: details.rating || 0,
      totalRatings: details.userRatingCount || 0,
      address: details.formattedAddress,
      photoUrl,
      location: {
        type: 'Point',
        coordinates: [details.location.longitude, details.location.latitude],
      },
      reviews,
      fetchedAt: new Date(),
    });
  }

  if (!user.tasteFingerprint?.fingerprintVector || user.fingerprintStale) {
    await buildFingerPrint(user);
  }

  const scoringPrompt = `You are scoring a single restaurant for a user.

    USER TASTE FINGERPRINT:
    ${JSON.stringify(user.tasteFingerprint, null, 2)}

    RESTAURANT:
    ${JSON.stringify(
      {
        name: restaurant.name,
        cuisines: restaurant.cuisines,
        priceLevel: restaurant.priceLevel,
        rating: restaurant.rating,
        reviewSnippets: (restaurant.reviews || [])
          .slice(0, 3)
          .map((r) => r.text),
      },
      null,
      2,
    )}

    Score 0-100. Return ONLY valid JSON:
    {
      "matchScore": 72,
      "reasons": ["reason 1"],
      "warnings": ["warning if any"],
      "suggestedDish": "one dish"
    }`;

  const scored = await callOpenAi(scoringPrompt, true);

  let socialProof = null;
  let adventureNudge = null;

  if (scored.matchScore < 55) {
    socialProof = await getSocialProof(user, restaurant._id);

    if (socialProof && socialProof.similarUsersWhoTried >= 2) {
      adventureNudge = `${socialProof.similarUsersWhoTried} people with a taste like yours loved ${restaurant.name} and gave it ${socialProof.averageRating}/5 — might be worth a try!`;
    }
  }

  return {
    success: true,
    restaurant: {
      _id: restaurant._id,
      name: restaurant.name,
      cuisines: restaurant.cuisines,
      priceLevel: restaurant.priceLevel,
      rating: restaurant.rating,
      totalRatings: restaurant.totalRatings,
      photoUrl: restaurant.photoUrl,
      address: restaurant.address,
    },
    matchScore: scored.matchScore,
    reasons: scored.reasons,
    warnings: scored.warnings,
    suggestedDish: scored.suggestedDish,
    socialProof,
    adventureNudge,
  };
};

const parsePriceLevel = (priceLevel) => {
  const mapping = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return mapping[priceLevel] || 0;
};
