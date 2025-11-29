import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useLoadScript
} from "@react-google-maps/api"
import { useHawkerCentres } from "../../hawkerCentres/hooks/useHawkerCentres"

const containerStyle = {
  width: "100%",
  height: "100%"
}

// custom icons for your own POIs
const HAWKER_ICON = "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
const SELECTED_HAWKER_ICON =
  "https://maps.google.com/mapfiles/ms/icons/orange-dot.png"

// load Places library for autocomplete
const libraries = ["places"]

// build a summary like "🚶 › 970 › DT" for transit routes
function buildModeSummary(route) {
  if (!route || !route.legs || !route.legs.length) return ""
  const leg = route.legs[0]
  const parts = []

  leg.steps.forEach(step => {
    if (step.travel_mode === "WALKING") {
      if (parts[parts.length - 1] !== "🚶") {
        parts.push("🚶")
      }
      return
    }

    if (step.travel_mode === "TRANSIT") {
      const transitInfo = step.transit || step.transit_details
      const shortName = transitInfo?.line?.short_name
      const vehicleType = transitInfo?.line?.vehicle?.type

      if (shortName) {
        parts.push(shortName)
      } else if (vehicleType === "BUS") {
        parts.push("Bus")
      } else {
        parts.push("MRT")
      }
    }
  })

  return parts.join("  ›  ")
}

export default function HawkerMap() {
  const { hawkerCentres: centres = [], loading: isLoading } =
    useHawkerCentres()

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  })

  const [searchParams] = useSearchParams()
  const centreIdFromUrl = searchParams.get("centreId")

  const [searchText, setSearchText] = useState("")
  const [selected, setSelected] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)

  const [travelMode, setTravelMode] = useState("DRIVING")
  const [directions, setDirections] = useState(null)
  const [directionsError, setDirectionsError] = useState("")
  const [isRouting, setIsRouting] = useState(false)

  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState("")

  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [showRouteDetails, setShowRouteDetails] = useState(true)

  // origin textbox + suggestions
  const [originText, setOriginText] = useState("")
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [originLocation, setOriginLocation] = useState(null)

  // whether user manually edited hawker search
  const [isSearchDirty, setIsSearchDirty] = useState(false)

  const focusedCentre = useMemo(
    () => centres.find(c => c.id === centreIdFromUrl),
    [centres, centreIdFromUrl]
  )

  const baseCentre = focusedCentre || centres[0]

  const mapCenter = baseCentre
    ? {
        lat: Number(baseCentre.latitude),
        lng: Number(baseCentre.longitude) - 0.015
      }
    : { lat: 1.3521, lng: 103.8198 }

  const defaultZoom = baseCentre ? 14 : 12

  console.log(centres)

  const matchingCentres = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.toLowerCase()
    return centres.filter(c => c.name.toLowerCase().includes(q))
  }, [centres, searchText])

  // default selected centre when no query in URL
  // debug: see what hawker centres we got from Supabase
  useEffect(() => {
    if (centres.length > 0) {
      console.log("Hawker centres count =", centres.length)
      console.log("First 3 centres =", centres.slice(0, 3))
    }
  }, [centres])


  // when arriving from "View on map" auto fill hawker name without opening dropdown
  useEffect(() => {
    if (focusedCentre) {
      setSelected(focusedCentre)
      setSearchText(focusedCentre.name)
      setIsSearchDirty(false)
    }
  }, [focusedCentre])

  const handleSelectCentre = centre => {
    setSelected(centre)
    setSearchText(centre.name)
    setIsSearchDirty(false)
    setDirections(null)
    setDirectionsError("")
    setSelectedRouteIndex(0)
    if (mapInstance) {
      mapInstance.panTo({
        lat: Number(centre.latitude),
        lng: Number(centre.longitude)
      })
      mapInstance.setZoom(16)
    }
  }

  // handle typing in "Your location"
  const handleOriginChange = e => {
    const value = e.target.value
    setOriginText(value)
    setOriginLocation(null)

    if (
      !value.trim() ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places
    ) {
      setOriginSuggestions([])
      return
    }

    const service = new window.google.maps.places.AutocompleteService()

    const request = {
      input: value,
      componentRestrictions: { country: "sg" }
    }

    if (mapInstance) {
      request.location = mapInstance.getCenter()
      request.radius = 50000
    }

    service.getPlacePredictions(request, (predictions, status) => {
      if (status !== "OK" || !predictions) {
        setOriginSuggestions([])
        return
      }
      setOriginSuggestions(predictions)
    })
  }

  // when user picks a suggestion from dropdown
  const handleSelectOriginSuggestion = prediction => {
    setOriginText(prediction.description)
    setOriginSuggestions([])

    if (!window.google || !window.google.maps) return

    const placesService = new window.google.maps.places.PlacesService(
      mapInstance || document.createElement("div")
    )

    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry"]
      },
      (place, status) => {
        if (status === "OK" && place?.geometry?.location) {
          const loc = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
          setOriginLocation(loc)
          setUserLocation(loc)

          if (mapInstance) {
            mapInstance.panTo(loc)
            mapInstance.setZoom(15)
          }
        }
      }
    )
  }

  const runRoute = origin => {
    if (!selected || !window.google) return

    setIsRouting(true)
    setDirectionsError("")
    setDirections(null)
    setSelectedRouteIndex(0)

    const request = {
      origin,
      destination: {
        lat: Number(selected.latitude),
        lng: Number(selected.longitude)
      },
      travelMode: window.google.maps.TravelMode[travelMode]
    }

    if (travelMode === "TRANSIT") {
      request.provideRouteAlternatives = true
      request.transitOptions = {
        departureTime: new Date(),
        modes: [
          window.google.maps.TransitMode.BUS,
          window.google.maps.TransitMode.RAIL
        ]
      }
    }

    const service = new window.google.maps.DirectionsService()

    service.route(request, (result, status) => {
      setIsRouting(false)
      if (status === "OK" && result) {
        console.log("ROUTES LENGTH =", result.routes.length)
        setDirections(result)
      } else {
        console.log("DIRECTIONS ERROR", status, result)
        setDirectionsError(
          "Could not find a route try another mode or move the map."
        )
      }
    })
  }

  const handleGetDirections = () => {
    if (!selected || !mapInstance) return

    // 1. use origin chosen from textbox if available
    if (originLocation) {
      runRoute(originLocation)
      return
    }

    // 2. otherwise use existing userLocation
    if (userLocation) {
      runRoute(userLocation)
      if (!originText) {
        setOriginText("Current location")
      }
      return
    }

    // 3. fallback to geolocation
    if (!navigator.geolocation) {
      setLocationError("Location is not supported in this browser.")
      return
    }

    setIsLocating(true)
    setLocationError("")

    navigator.geolocation.getCurrentPosition(
      position => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(loc)
        setOriginLocation(loc)
        setOriginText("Current location")
        setIsLocating(false)

        mapInstance.panTo(loc)
        mapInstance.setZoom(15)

        runRoute(loc)
      },
      () => {
        setIsLocating(false)
        setLocationError(
          "Unable to get your location. Check browser permissions."
        )
      }
    )
  }

  const handleSearchChange = e => {
    const value = e.target.value
    setSearchText(value)
    setIsSearchDirty(true)
  }

  const currentRoute =
    directions && directions.routes[selectedRouteIndex]
      ? directions.routes[selectedRouteIndex]
      : null

  const currentLeg =
    currentRoute && currentRoute.legs && currentRoute.legs[0]
      ? currentRoute.legs[0]
      : null

  if (!isLoaded) return <div className="p-6">Loading map…</div>
  if (isLoading) return <div className="p-6">Loading hawker centres…</div>

  return (
    <div className="w-full h-screen bg-[#F6FBF2]">
      <div className="relative w-full h-full">
 <GoogleMap
  mapContainerStyle={containerStyle}
  center={mapCenter}
  zoom={defaultZoom}
  onLoad={map => setMapInstance(map)}
  options={{
    mapTypeId: "roadmap",
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    clickableIcons: true,
    styles: [
      {
        featureType: "poi",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.attraction",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.government",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.medical",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.place_of_worship",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.park",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "poi.school",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "transit.station.bus",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "transit.station.rail",
        stylers: [{ visibility: "off" }]
      },
    ]
  }}
>
  {/* user location marker */}

{/* user location marker */}
{/* user location marker */}
{userLocation && (
  <Marker
    position={userLocation}
    icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    zIndex={3000}
  />
)}




<Marker position={mapCenter} />

{centres && centres.map(c => {
  const lat = Number(c.latitude);
  const lng = Number(c.longitude);

  console.log("Centre:", c.name, "Lat:", lat, "Lng:", lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn("Skipping invalid coords for", c);
    return null;
  }

  return (
    <Marker
      key={c.id}
      position={{ lat, lng }}
      zIndex={1000}
      title={c.name}
      onClick={() => handleSelectCentre(c)}
    />
  );
})}





{/* Route Renderer */}
{directions && (
  <DirectionsRenderer
    options={{
      directions,
      routeIndex: selectedRouteIndex,
      suppressMarkers: true,
      preserveViewport: false
    }}
  />
)}



</GoogleMap>


        {/* overlay panel */}
        <div className="absolute left-6 top-6 z-20 max-w-sm w-[430px] bg-white rounded-[24px] shadow-lg p-6">
<h1 className="mb-4 text-2xl font-bold text-[#21421B]">
  Hawker map{" "}
  <span className="text-xs font-normal text-gray-400">
    ({centres.length} centres)
  </span>
</h1>


          {/* origin textbox */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Your location
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your location or address"
                className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]"
                value={originText}
                onChange={handleOriginChange}
              />

              {originSuggestions.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
                  {originSuggestions.map(prediction => (
                    <li key={prediction.place_id}>
                      <button
                        type="button"
                        className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F6FBF2]"
                        onClick={() =>
                          handleSelectOriginSuggestion(prediction)
                        }
                      >
                        <span className="text-sm text-gray-900">
                          {prediction.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* search with autocomplete */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search hawker centre"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]"
              value={searchText}
              onChange={handleSearchChange}
            />

            {isSearchDirty &&
              searchText.trim() !== "" &&
              matchingCentres.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
                  {matchingCentres.map(c => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F6FBF2]"
                        onClick={() => handleSelectCentre(c)}
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {c.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {c.address}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            {selected ? (
              <>
                {/* hawker info text only */}
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {selected.address}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Lat {selected.latitude} Lng {selected.longitude}
                  </p>
                </div>

                {/* mode buttons */}
                <div className="mt-3 flex gap-2">
                  {[
                    { key: "DRIVING", label: "Drive" },
                    { key: "WALKING", label: "Walk" },
                    { key: "TRANSIT", label: "Public" }
                  ].map(option => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setTravelMode(option.key)
                        setDirections(null)
                        setDirectionsError("")
                        setSelectedRouteIndex(0)
                      }}
                      className={`flex-1 rounded-xl border px-2 py-1 text-xs font-medium ${
                        travelMode === option.key
                          ? "bg-[#21421B] text-white border-[#21421B]"
                          : "bg-white text-gray-700 border-[#D1D5DB]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* get directions button */}
                <button
                  type="button"
                  onClick={handleGetDirections}
                  disabled={isRouting || isLocating}
                  className="mt-4 w-full rounded-xl bg-[#21421B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3416] disabled:opacity-60"
                >
                  {isLocating
                    ? "Detecting your location…"
                    : isRouting
                    ? "Finding route…"
                    : "Get directions"}
                </button>

                {directionsError && (
                  <p className="mt-2 text-xs text-red-500">
                    {directionsError}
                  </p>
                )}
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">
                    {locationError}
                  </p>
                )}

                {/* route options for Public */}
                {travelMode === "TRANSIT" &&
                  directions &&
                  directions.routes.length > 0 && (
                    <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                      <p className="text-xs font-semibold text-gray-700">
                        Choose a route
                      </p>
                      <div className="mt-2 max-h-40 space-y-2 overflow-auto pr-1">
                        {directions.routes.map((route, idx) => {
                          const leg =
                            route.legs && route.legs[0]
                              ? route.legs[0]
                              : null
                          if (!leg) return null

                          const isActive = idx === selectedRouteIndex
                          const duration = leg.duration?.text
                          const distance = leg.distance?.text
                          const depart = leg.departure_time?.text
                          const arrive = leg.arrival_time?.text
                          const modeSummary = buildModeSummary(route)

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedRouteIndex(idx)
                                setShowRouteDetails(true)
                              }}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-xs min-h-[64px] ${
                                isActive
                                  ? "border-[#21421B] bg-[#F6FBF2]"
                                  : "border-[#E5E7EB] bg-white"
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                  {duration} • {distance}
                                </span>
                                {modeSummary && (
                                  <span className="mt-1 text-[11px] text-gray-600">
                                    {modeSummary}
                                  </span>
                                )}
                              </div>
                              {(depart || arrive) && (
                                <span className="ml-3 text-[11px] text-gray-500 whitespace-nowrap">
                                  {depart} – {arrive}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                {/* details for selected route */}
                {currentLeg && (
                  <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {currentLeg.duration?.text} •{" "}
                        {currentLeg.distance?.text}
                      </p>
                      <button
                        type="button"
                        className="ml-3 text-[11px] text-gray-500 underline"
                        onClick={() =>
                          setShowRouteDetails(prev => !prev)
                        }
                      >
                        {showRouteDetails
                          ? "Hide directions"
                          : "Show directions"}
                      </button>
                    </div>

                    {showRouteDetails && (
                      <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1 text-sm text-gray-900">
                        {currentLeg.steps.map((step, index) => (
                          <li
                            key={index}
                            className="flex gap-2 pb-3"
                          >
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#21421B]" />
                            <span>
                              {step.instructions.replace(
                                /<[^>]+>/g,
                                ""
                              )}{" "}
                              ({step.distance.text})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Tap a hawker icon on the map to see its details and route.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
