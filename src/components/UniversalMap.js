import React from 'react';
// It is safe to import Web logic here because this file ONLY runs on web
import WebMapLogic from './WebMapLogic';

export default function UniversalMap(props) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
       {/* Pass the city prop to initialize the logic */}
       <WebMapLogic initialCityId={props.city} />
    </div>
  );
}