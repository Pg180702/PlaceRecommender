import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    preferences: {
      cuisines: {
        type: [String],
        default: [],
      },

      spiceLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },

      priceRange: {
        type: String,
        enum: ['budget', 'mid', 'upscale'],
        default: 'mid',
      },
      dietaryRestrictions: {
        type: [String],
        default: [],
      },

      ambiance: {
        type: [String],
        default: [],
      },

      mealOccasion: {
        type: String,
        default: 'lunch',
      },
    },

    enjoyedRestaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place',
      },
    ],

    tasteFingerprint: {
      cuisineAffinity: {
        type: Map,
        of: Number,
        default: {},
      },

      spiceComfort: {
        type: Number,
        min: 1,
        max: 5,
      },

      priceComfort: {
        type: Number,
        min: 0,
        max: 4,
      },

      ambianceScores: {
        type: Map,
        of: Number,
        default: {},
      },

      adventureScore: {
        type: Number,
        min: 0,
        max: 1,
      },

      keySignals: {
        type: [String],
        default: [],
      },

      fingerprintVector: {
        type: [Number],
        validate: {
          validator: function (v) {
            return v.length === 8;
          },
          message: 'fingerprintVector must have exactly 8 elements',
        },
        // Dimensions (all 0.0 to 1.0):
        // [0] north_indian affinity
        // [1] south_indian affinity
        // [2] street_food affinity
        // [3] italian affinity
        // [4] chinese affinity
        // [5] spice_tolerance (normalized)
        // [6] price_sensitivity (higher = more price-conscious)
        // [7] adventure_score
      },
    },

    fingerprintStale: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Auto-manages createdAt and updatedAt
    collection: 'users',
  },
);

export const User = new mongoose.model('User', userSchema);
