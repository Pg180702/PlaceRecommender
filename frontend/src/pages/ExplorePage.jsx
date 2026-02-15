import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Check, MapPin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const PRICE_LEVEL_MAP = { 0: '₹', 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };
const PAGE_SIZE = 12;

export default function ExplorePage() {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [places, setPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enjoyedIds, setEnjoyedIds] = useState(new Set());
  const [addingId, setAddingId] = useState(null);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState(null);

  // Debounce search input and reset to page 0
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPlaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ pageNo: page, pageSize: PAGE_SIZE });
      if (debouncedQuery.trim()) params.set('searchQuery', debouncedQuery.trim());
      const res = await apiFetch(getToken, `/places?${params}`);
      if (res.success) {
        setPlaces(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch {
      toast.error('Failed to load places');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, page, debouncedQuery]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const handleAddToEnjoyed = async (place) => {
    setAddingId(place._id);
    try {
      const res = await apiFetch(getToken, '/enjoyed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantIds: [place._id] }),
      });
      if (res.success) {
        setEnjoyedIds((prev) => new Set([...prev, place._id]));
        toast.success(`Added ${place.name} to your enjoyed list`);
      } else {
        toast.error(res.message || 'Failed to add restaurant');
      }
    } catch {
      toast.error('Failed to add restaurant');
    } finally {
      setAddingId(null);
    }
  };

  const totalPages = pagination?.totalPages ?? 0;
  const totalRecords = pagination?.totalRecords ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster richColors />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Places</h1>
        <p className="text-gray-600">Browse restaurants in your city and add your favorites to your enjoyed list</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, cuisine, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : places.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No places found{debouncedQuery ? ' matching your search' : ''}.</p>
        </div>
      ) : (
        <>
          {totalRecords > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalRecords)} of {totalRecords}
            </p>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map((place) => (
              <Card key={place._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {place.photoUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{place.name}</CardTitle>
                    <Badge variant="secondary">{PRICE_LEVEL_MAP[place.priceLevel] || '₹₹'}</Badge>
                  </div>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {place.cuisines?.slice(0, 2).map((c) => (
                        <span key={c} className="text-sm">{c}</span>
                      ))}
                      {place.address && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm truncate max-w-[120px]">{place.address}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{place.rating}/5</span>
                      </div>
                      {place.googleMapsUrl && (
                        <a
                          href={place.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <MapPin className="size-4" />
                          View on Maps
                        </a>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {enjoyedIds.has(place._id) ? (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <Check className="size-4" />
                      Added to Enjoyed
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleAddToEnjoyed(place)}
                      className="w-full gap-2"
                      disabled={addingId === place._id}
                    >
                      {addingId === place._id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      Add to Enjoyed
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="gap-1"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination?.hasNextPage}
                className="gap-1"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
