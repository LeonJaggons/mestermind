import { LocationSearchResult, Service } from '@/lib/api';

interface RecentSearch {
  id: string;
  service: Service;
  location: LocationSearchResult;
  timestamp: number;
}

export const saveRecentSearch = (service: Service, location: LocationSearchResult) => {
  const newSearch: RecentSearch = {
    id: `${service.id}-${location.id}`,
    service,
    location,
    timestamp: Date.now(),
  };

  const existingSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  
  // Remove any existing search with the same service-location combination
  const filteredSearches = existingSearches.filter(
    (search: RecentSearch) => search.id !== newSearch.id
  );
  
  // Add the new search and limit to 5 total
  const updatedSearches = [newSearch, ...filteredSearches].slice(0, 5);
  
  localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
};
