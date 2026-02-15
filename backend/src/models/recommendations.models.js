import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recommendations: [
      {
        restaurant: {
          _id: mongoose.Schema.Types.ObjectId,
          name: String,
          cuisines: [String],
          priceLevel: Number,
          rating: Number,
          totalRatings: Number,
          photoUrl: String,
          address: String,
          googleMapsUrl: String,
        },
        matchScore: Number,
        reasons: [String],
        warnings: [String],
        suggestedDish: String,
        socialProof: {
          similarUsersWhoTried: Number,
          averageRating: Number,
        },
        adventureNudge: String,
      },
    ],
  },
  { timestamps: true },
);

export const Recommendation = mongoose.model(
  'Recommendation',
  recommendationSchema,
);
