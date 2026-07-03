import type { Href } from 'expo-router';

function routeSegment(value: string) {
  return encodeURIComponent(value);
}

export function singleRouteParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function cityRoute(city: string): Href {
  return `/city/${routeSegment(city)}` as Href;
}

export function placeRoute(slug: string): Href {
  return `/place/${routeSegment(slug)}` as Href;
}

export function readerRoute(slug: string): Href {
  return `/reader/${routeSegment(slug)}` as Href;
}
