import React from "react";
// Import the Web Mapbox GL component we perfected earlier
//import Map from './Map';
import WebMapLogic from "./WebMapLogic";

export default function UniversalMap(props) {
  return (
    <div style={{ height: "100%", width: "100%" }}>
      {/* Pass the city prop to initialize the logic */}
      <WebMapLogic initialCityId={props.city} />
    </div>
  );
}
