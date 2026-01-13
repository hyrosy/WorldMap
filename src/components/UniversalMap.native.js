import React from 'react';
// It is safe to import Native logic here because this file ONLY runs on mobile
import NativeMap from './NativeMap';

export default function UniversalMap(props) {
  // Pass ALL props (pins, routes, refs) down to the Native Map
  return <NativeMap {...props} />;
}