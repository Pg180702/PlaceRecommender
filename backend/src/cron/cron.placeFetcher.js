import {
  CITY_CENTER,
  placeSearchQueries,
} from '../constants/constants.placeSearchQueries.js';
import { Place } from '../models/places.models.js';
import {
  callGooglePlacesApi,
  getPhotoUrl,
  inferCuisines,
} from '../utils/utils.placeFetcher.js';

const SEARCH_API_URL = process.env.GOOGLE_TEXT_SEARCH_API;
const MAX_PAGES_PER_QUERY = 3;
const PAGE_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPlaceIdsFromTextSearch = async (searchQuery, pageToken = null) => {
  if (!SEARCH_API_URL) throw new Error('Missing GOOGLE_TEXT_SEARCH_API');

  const body = {
    textQuery: searchQuery,
    locationBias: {
      circle: {
        center: {
          latitude: CITY_CENTER.lat,
          longitude: CITY_CENTER.lng,
        },
        radius: 15000,
      },
    },
  };

  if (pageToken) body.pageToken = pageToken;

  const data = await callGooglePlacesApi({
    url: SEARCH_API_URL,
    method: 'POST',
    data: body,
    fieldMask: 'places.id,nextPageToken',
  });

  const places = data?.places ?? [];
  return {
    placeIds: places.map((p) => p.id).filter(Boolean),
    nextPageToken: data?.nextPageToken ?? null,
  };
};

const fetchPlaceDataFromGoogle = async (placeId) => {
  const data = await callGooglePlacesApi({
    url: `${process.env.GOOGLE_PLACES_API}/places/${placeId}`,
    method: 'GET',
    fieldMask:
      'id,displayName,formattedAddress,location,priceLevel,rating,userRatingCount,types,reviews,photos,regularOpeningHours,businessStatus',
  });
  return data ?? null;
};

const fetchUniquePlaceIds = async () => {
  const uniqueIds = new Set();

  for (const searchQuery of placeSearchQueries) {
    let pageToken = null;
    let page = 0;

    while (page < MAX_PAGES_PER_QUERY) {
      const { placeIds, nextPageToken } = await fetchPlaceIdsFromTextSearch(
        searchQuery,
        pageToken,
      );

      for (const id of placeIds) uniqueIds.add(id);

      if (!nextPageToken) break;

      pageToken = nextPageToken;
      page += 1;
      await sleep(PAGE_DELAY_MS);
    }
  }

  return [...uniqueIds];
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

const extractTimings = (regularOpeningHours) => {
  if (
    !regularOpeningHours?.periods ||
    regularOpeningHours.periods.length === 0
  ) {
    return {};
  }

  const firstPeriod = regularOpeningHours.periods[0];
  if (!firstPeriod) return {};

  const result = {};

  if (firstPeriod.open) {
    const hour = String(firstPeriod.open.hour || 0).padStart(2, '0');
    const minute = String(firstPeriod.open.minute || 0).padStart(2, '0');
    result.openingTime = `${hour}:${minute}`;
  }

  if (firstPeriod.close) {
    const hour = String(firstPeriod.close.hour || 0).padStart(2, '0');
    const minute = String(firstPeriod.close.minute || 0).padStart(2, '0');
    result.closingTime = `${hour}:${minute}`;
  }

  return result;
};

const fetchPlaceDetailsAndUpsert = async (placeIds) => {
  let upserted = 0;
  let failed = 0;

  for (const id of placeIds) {
    try {
      const placeDetails = await fetchPlaceDataFromGoogle(id);

      if (!placeDetails || !placeDetails.location) {
        console.log(`Skipping ${id} - missing location data`);
        failed++;
        continue;
      }

      const cuisines = inferCuisines(
        placeDetails.types,
        placeDetails.displayName?.text,
      );

      const photoUrl = placeDetails.photos?.[0]
        ? getPhotoUrl(placeDetails.photos[0].name)
        : null;

      const reviews = (placeDetails.reviews || []).map((r) => ({
        text: r.text?.text || r.text || '',
        rating: r.rating || 0,
        authorName:
          r.authorAttribution?.displayName || r.author_name || 'Anonymous',
      }));

      const doc = {
        googlePlaceId: id,
        name: placeDetails.displayName?.text || 'Unknown',
        cuisines: cuisines,
        priceLevel: placeDetails.priceLevel
          ? parsePriceLevel(placeDetails.priceLevel)
          : 0,
        rating: placeDetails.rating || 0,
        totalRatings: placeDetails.userRatingCount || 0,
        address: placeDetails.formattedAddress || '',
        photoUrl: photoUrl,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${id}`,
        location: {
          type: 'Point',
          coordinates: [
            placeDetails.location.longitude,
            placeDetails.location.latitude,
          ],
        },
        timings: extractTimings(placeDetails.regularOpeningHours),
        reviews: reviews,
        fetchedAt: new Date(),
      };

      await Place.findOneAndUpdate({ googlePlaceId: id }, doc, {
        upsert: true,
        new: true,
      });

      upserted++;
      console.log(`${doc.name} (${cuisines.join(', ')})`);

      await sleep(300);
    } catch (error) {
      console.error(`Failed to process ${id}:`, error.message);
      failed++;
    }
  }

  console.log(`\nUpserted ${upserted} places, Failed ${failed}`);
};

export const refreshPlaceDetails = async () => {
  const placeIds = await fetchUniquePlaceIds();
  console.log(`Found ${placeIds.length} unique place IDs`);
  await fetchPlaceDetailsAndUpsert(placeIds);
};
