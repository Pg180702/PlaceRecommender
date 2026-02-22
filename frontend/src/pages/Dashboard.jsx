import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Camera, AlertCircle, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const PRICE_LEVEL_MAP = { 0: '₹', 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [stats, setStats] = useState({
    preferencesSet: 0,
    enjoyedCount: 0,
    recommendationsCount: 0,
  });
  const [recommendations, setRecommendations] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoAnalysis, setPhotoAnalysis] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch(getToken, '/stats');
      if (res.success) setStats(res.data);
    } catch (error) {
      console.log('Failed to load stats due to error - ', error);
    }
  }, [getToken]);

  const loadLastRecommendations = useCallback(async () => {
    setIsLoadingRecs(true);
    try {
      const res = await apiFetch(getToken, '/fetchPastUserRecommendations');
      if (res.success) setRecommendations(res.data || []);
    } catch (error) {
      console.log('Failed to load recommendations due to error - ', error);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadStats();
    loadLastRecommendations();
  }, [loadStats, loadLastRecommendations]);

  const hasPreferences = stats.preferencesSet > 0;
  const hasEnjoyedPlaces = stats.enjoyedCount > 0;

  const handleGenerateRecommendations = async () => {
    if (!hasPreferences && !hasEnjoyedPlaces) {
      toast.error(
        'Please set up your preferences and add enjoyed restaurants first',
      );
      return;
    }
    if (!hasPreferences) {
      toast.error(
        'Please head over to Preferences first and set up your preferences',
      );
      return;
    }
    if (!hasEnjoyedPlaces) {
      toast.error(
        "Please add some enjoyed restaurants to help us recommend places you'll love",
      );
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiFetch(getToken, '/recommendations');
      if (res.success) {
        setRecommendations(res.data || []);
        toast.success('Recommendations generated successfully!');
        loadStats();
      } else {
        toast.error(res.message || 'Failed to generate recommendations');
      }
    } catch {
      toast.error('Failed to generate recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  };

  const handleAnalyzePhoto = async () => {
    if (!photoFile) return;
    if (!hasPreferences) {
      toast.error('Please set up your preferences to analyze photos');
      return;
    }
    if (!hasEnjoyedPlaces) {
      toast.error(
        'Please add some enjoyed restaurants to get accurate photo analysis',
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/user/scanInfo`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      const data = await res.json();

      if (data.success) {
        setPhotoAnalysis(data.data);
      } else {
        toast.error(data.message || 'Failed to analyze photo');
      }
    } catch {
      toast.error('Failed to analyze photo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClosePhotoDialog = () => {
    setShowPhotoDialog(false);
    setPhotoFile(null);
    setPhotoAnalysis(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster richColors />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'there'}!
        </h1>
        <p className="text-gray-600">
          Discover new places tailored to your taste
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Preferences Set</CardDescription>
            <CardTitle className="text-3xl">{stats.preferencesSet}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Enjoyed Restaurants</CardDescription>
            <CardTitle className="text-3xl">{stats.enjoyedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Recommendations</CardDescription>
            <CardTitle className="text-3xl">
              {stats.recommendationsCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-8">
        <Button
          onClick={handleGenerateRecommendations}
          disabled={isGenerating}
          size="lg"
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-5" />
              Get Recommendations
            </>
          )}
        </Button>
        <Button
          onClick={() => setShowPhotoDialog(true)}
          variant="outline"
          size="lg"
          className="gap-2"
        >
          <Camera className="size-5" />
          Upload Photo
        </Button>
      </div>

      {/* Recommendations */}
      {isLoadingRecs ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="size-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Get Started
            </h3>
            <p className="text-gray-500 mb-6">
              You haven't generated any recommendations yet.
            </p>
            {(!hasPreferences || !hasEnjoyedPlaces) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex gap-3">
                  <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm text-blue-900 font-medium mb-1">
                      Complete your profile
                    </p>
                    <p className="text-sm text-blue-700">
                      {!hasPreferences && !hasEnjoyedPlaces
                        ? 'Set up your preferences and add enjoyed restaurants to get personalized recommendations.'
                        : !hasPreferences
                          ? 'Set up your preferences to get started.'
                          : 'Add some enjoyed restaurants to help us understand your taste.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Your Recommendations
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => (
              <Card
                key={rec.restaurant?._id || idx}
                className="overflow-hidden"
              >
                {rec.restaurant?.photoUrl && (
                  <div className="aspect-video overflow-hidden relative">
                    <img
                      src={rec.restaurant.photoUrl}
                      alt={rec.restaurant.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-600">
                        {rec.matchScore}% Match
                      </Badge>
                    </div>
                  </div>
                )}
                {!rec.restaurant?.photoUrl && (
                  <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                    <Sparkles className="size-10 text-gray-300" />
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-green-600">
                        {rec.matchScore}% Match
                      </Badge>
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">
                      {rec.restaurant?.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {PRICE_LEVEL_MAP[rec.restaurant?.priceLevel] || '₹₹'}
                    </Badge>
                  </div>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rec.restaurant?.cuisines?.slice(0, 2).map((c) => (
                        <span key={c} className="text-sm">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm font-medium">
                        {rec.restaurant?.rating}
                      </span>
                    </div>
                    {rec.reasons?.length > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        {rec.reasons[0]}
                      </p>
                    )}
                    {rec.suggestedDish && (
                      <p className="text-sm text-blue-600 font-medium">
                        Try: {rec.suggestedDish}
                      </p>
                    )}
                  </CardDescription>
                </CardHeader>
                {rec.restaurant?.googleMapsUrl && (
                  <CardContent className="pt-0">
                    <a
                      href={rec.restaurant.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View on Maps →
                    </a>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={handleClosePhotoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Place Photo</DialogTitle>
            <DialogDescription>
              Upload a photo of a place and we'll analyze how well it matches
              your preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="photo">Select Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isAnalyzing}
              />
            </div>

            {photoFile && !photoAnalysis && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Selected file:</p>
                <p className="text-sm font-medium">{photoFile.name}</p>
              </div>
            )}

            {photoAnalysis && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    {photoAnalysis.placeName || photoAnalysis.name}
                  </h4>
                  <Badge
                    className={
                      photoAnalysis.matchScore >= 80
                        ? 'bg-green-600'
                        : photoAnalysis.matchScore >= 60
                          ? 'bg-yellow-600'
                          : 'bg-orange-600'
                    }
                  >
                    {photoAnalysis.matchScore}% Match
                  </Badge>
                </div>
                {photoAnalysis.cuisine && (
                  <p className="text-sm text-gray-600">
                    {photoAnalysis.cuisine}
                  </p>
                )}
                {photoAnalysis.details && (
                  <p className="text-sm text-gray-700">
                    {photoAnalysis.details}
                  </p>
                )}
                {photoAnalysis.reasons && photoAnalysis.reasons.length > 0 && (
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    {photoAnalysis.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!photoAnalysis ? (
                <Button
                  onClick={handleAnalyzePhoto}
                  disabled={!photoFile || isAnalyzing}
                  className="flex-1"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Photo'
                  )}
                </Button>
              ) : (
                <Button onClick={handleClosePhotoDialog} className="flex-1">
                  Done
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
