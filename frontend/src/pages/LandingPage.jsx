import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { MapPin, Sparkles, Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 rounded-full p-4">
              <MapPin className="size-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Discover Your Perfect Place
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            PlaceMatch uses AI to recommend restaurants and places you'll love
            based on your preferences and past experiences. Find your next
            favorite spot effortlessly.
          </p>

          <div className="flex gap-4 justify-center">
            <SignUpButton mode="modal">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-lg size-12 flex items-center justify-center mb-4">
                <Sparkles className="size-6 text-blue-600" />
              </div>
              <CardTitle>AI-Powered Recommendations</CardTitle>
              <CardDescription>
                Get personalized restaurant suggestions based on your unique
                taste profile
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-purple-100 rounded-lg size-12 flex items-center justify-center mb-4">
                <Heart className="size-6 text-purple-600" />
              </div>
              <CardTitle>Track Your Favorites</CardTitle>
              <CardDescription>
                Save restaurants you've enjoyed to help us understand your
                preferences better
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-green-100 rounded-lg size-12 flex items-center justify-center mb-4">
                <Camera className="size-6 text-green-600" />
              </div>
              <CardTitle>Photo Analysis</CardTitle>
              <CardDescription>
                Upload a photo of any place and we'll tell you how well it
                matches your taste
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
