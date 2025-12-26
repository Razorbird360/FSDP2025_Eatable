import { useState, useMemo, useEffect, useRef } from "react"
import hawkerIcon from "../../../assets/icons/hawker-featured.png"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  GoogleMap,
  Marker,
  OverlayView,
  useLoadScript
} from "@react-google-maps/api"
import { useHawkerCentres } from "../../hawkerCentres/hooks/useHawkerCentres"

const containerStyle = { width: "100%", height: "100%" }
const libraries = ["places", "marker"]

// Helper: Formats the image URL. 
// If your backend needs a prefix (like 'http://localhost:3000/'), add it here.
function getImageUrl(imagePath) {
  if (!imagePath) return null;
  // Example: if (imagePath.startsWith("http")) return imagePath;
  // Example: return `http://localhost:8080/${imagePath}`;
  return imagePath; 
}

function buildModeSummary(route) {
  if (!route?.legs?.length) return ""
  const leg = route.legs[0]
  const parts = []

  leg.steps.forEach(step => {
    if (step.travel_mode === "WALKING") {
      if (parts[parts.length - 1] !== "🚶") parts.push("🚶")
      return
    }
    if (step.travel_mode === "TRANSIT") {
      const t = step.transit || step.transit_details
      const shortName = t?.line?.short_name
      const vehicleType = t?.line?.vehicle?.type
      if (shortName) parts.push(shortName)
      else if (vehicleType === "BUS") parts.push("Bus")
      else parts.push("MRT")
    }
  })

  return parts.join("  ›  ")
}

function CustomAdvancedMarker({ map, position, title, content, zIndex, onClick }) {
  useEffect(() => {
    if (!map || !window.google?.maps?.marker) return
    if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return

    const { AdvancedMarkerElement } = window.google.maps.marker
    const marker = new AdvancedMarkerElement({
      map,
      position,
      title,
      zIndex,
      ...(content ? { content } : {})
    })

    let clickListener = null
    if (onClick) clickListener = marker.addListener("gmp-click", onClick)

    return () => {
      if (clickListener) clickListener.remove()
      marker.map = null
    }
  }, [map, position?.lat, position?.lng, title, zIndex, content, onClick])

  return null
}

function HawkerCentreMarker({ map, centre, isSelected, isMain, zoom, onClick }) {
  if (!centre) return null
  const lat = Number(centre.latitude)
  const lng = Number(centre.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const LABEL_ZOOM_THRESHOLD = 11
  const showLabel = isMain || isSelected || (zoom ?? 0) >= LABEL_ZOOM_THRESHOLD

  const wrapper = document.createElement("div")
  wrapper.className = "relative flex items-center justify-center"
  wrapper.style.width = "16px"
  wrapper.style.height = "16px"

  const icon = document.createElement("img")
  icon.src = hawkerIcon
  icon.style.width = "30px"
  icon.style.height = "30px"
  icon.style.position = "absolute"
  icon.style.left = "50%"
  icon.style.top = "50%"
  icon.style.transform = "translate(-50%, -50%)"
  wrapper.appendChild(icon)

  if (showLabel) {
    const label = document.createElement("div")
    label.className =
      "rounded-full px-3 py-1 text-[11px] font-semibold shadow-md border border-white whitespace-nowrap " +
      (isSelected ? "bg-orange-500 text-white" : "bg-green-600 text-white")
    label.textContent = centre.name
    label.style.position = "absolute"
    label.style.left = "18px"
    label.style.top = "50%"
    label.style.transform = "translateY(-50%)"
    wrapper.appendChild(label)
  }

  return (
    <CustomAdvancedMarker
      map={map}
      position={{ lat, lng }}
      title={centre.name}
      content={wrapper}
      zIndex={isSelected ? 3000 : isMain ? 2500 : 1000}
      onClick={onClick}
    />
  )
}

export default function HawkerMap() {
  const { hawkerCentres: centres = [], loading: isLoading } = useHawkerCentres()

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  })

  const [searchParams] = useSearchParams()
  const centreIdFromUrl = searchParams.get("centreId")
  const navigate = useNavigate()

  const [searchText, setSearchText] = useState("")
  const [selected, setSelected] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [zoom, setZoom] = useState(12)

  const [travelMode, setTravelMode] = useState("DRIVING")
  
  // "activeDirections" is what is drawn on the map (The Blue Line)
  const [activeDirections, setActiveDirections] = useState(null)
  
  // "previewDistance" is used just for the popup text (The "13.5km" text)
  const [previewDistance, setPreviewDistance] = useState("")
  
  const [directionsError, setDirectionsError] = useState("")
  const [isRouting, setIsRouting] = useState(false)

  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState("")

  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [showRouteDetails, setShowRouteDetails] = useState(true)
  const [isTransitChoosingRoute, setIsTransitChoosingRoute] = useState(true)

  const [originText, setOriginText] = useState("")
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [originLocation, setOriginLocation] = useState(null)

  const [isSearchDirty, setIsSearchDirty] = useState(false)
  const [hasInitialCentered, setHasInitialCentered] = useState(false)

  const [showPopup, setShowPopup] = useState(false)
  const [popupPos, setPopupPos] = useState(null)

  const directionsRendererInstanceRef = useRef(null)
  const mapWrapRef = useRef(null)

  const clearDirections = () => {
    setActiveDirections(null)
    setDirectionsError("")
    setSelectedRouteIndex(0)
    setShowRouteDetails(true)
    setIsTransitChoosingRoute(true)
  }

  const focusedCentre = useMemo(
    () => centres.find(c => c.id === centreIdFromUrl),
    [centres, centreIdFromUrl]
  )

  const baseCentre = focusedCentre || centres[0] || null

  const matchingCentres = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.toLowerCase()
    return centres.filter(c => c.name.toLowerCase().includes(q))
  }, [centres, searchText])

  // Filter routes for the map line
  const displayedDirections = useMemo(() => {
    if (!activeDirections || !activeDirections.routes || !activeDirections.routes[selectedRouteIndex]) {
      return null
    }
    return {
      ...activeDirections,
      routes: [activeDirections.routes[selectedRouteIndex]]
    }
  }, [activeDirections, selectedRouteIndex])

  // ✅ 1. PREVIEW DISTANCE CALCULATION
  // When 'selected' changes, we silently calculate distance WITHOUT drawing the line.
  useEffect(() => {
    if (!window.google?.maps || !selected) {
      setPreviewDistance("")
      return
    }

    const origin = originLocation || userLocation
    if (!origin) {
      setPreviewDistance("")
      return
    }

    const dest = {
      lat: Number(selected.latitude),
      lng: Number(selected.longitude)
    }

    // Use DirectionsService (Reliable) instead of DistanceMatrix (Legacy/Error prone)
    const service = new window.google.maps.DirectionsService()
    service.route(
      {
        origin,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING // Default to driving for preview
      },
      (result, status) => {
        if (status === "OK" && result.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0]
          // e.g. "13.5 km"
          setPreviewDistance(leg.distance?.text || "")
        } else {
          setPreviewDistance("")
        }
      }
    )
  }, [selected, originLocation, userLocation])

  // ✅ 2. MANUAL RENDERER (Ghost Line Fix)
  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return

    if (!directionsRendererInstanceRef.current) {
      directionsRendererInstanceRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
      })
    }

    const renderer = directionsRendererInstanceRef.current

    if (displayedDirections) {
      renderer.setMap(mapInstance)
      renderer.setDirections(displayedDirections)
      renderer.setRouteIndex(0)
    } else {
      renderer.setMap(null)
    }
  }, [mapInstance, displayedDirections])

  // Initial Center
  useEffect(() => {
    if (!mapInstance || hasInitialCentered || !baseCentre) return

    const target = {
      lat: Number(baseCentre.latitude),
      lng: Number(baseCentre.longitude) - 0.015
    }

    mapInstance.setCenter(target)
    mapInstance.setZoom(14)
    setZoom(14)
    setHasInitialCentered(true)
  }, [mapInstance, baseCentre, hasInitialCentered])

  // Grey Map Fix
  useEffect(() => {
    if (!mapInstance || !mapWrapRef.current) return

    const observer = new ResizeObserver(() => {
      if (window.google?.maps?.event) {
        window.google.maps.event.trigger(mapInstance, "resize")
        const c = mapInstance.getCenter()
        if (c) mapInstance.setCenter(c)
      }
    })

    observer.observe(mapWrapRef.current)
    return () => observer.disconnect()
  }, [mapInstance])

  // Initial URL load
  useEffect(() => {
    if (!focusedCentre) return

    setSelected(focusedCentre)
    setSearchText(focusedCentre.name)
    setIsSearchDirty(false)

    const lat = Number(focusedCentre.latitude)
    const lng = Number(focusedCentre.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPopupPos({ lat, lng })
      setShowPopup(true)
    }

    clearDirections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedCentre])

  const handleSelectCentre = (centre, updateInput = true) => {
    setSelected(centre)
    
    // Only update search bar if clicked from list (updateInput=true).
    // If clicked on map, keep search bar as is.
    if (updateInput) {
      setSearchText(centre.name)
    }
    
    setIsSearchDirty(false)

    const lat = Number(centre.latitude)
    const lng = Number(centre.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setPopupPos({ lat, lng })
      setShowPopup(true)
    } else {
      setPopupPos(null)
      setShowPopup(false)
    }

    // Clear the blue line when picking a new place, until they click "Get Directions"
    clearDirections()
  }

  const handleOriginChange = e => {
    const value = e.target.value
    setOriginText(value)
    setOriginLocation(null)

    if (!value.trim() || !window.google?.maps?.places) {
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

  const handleSelectOriginSuggestion = prediction => {
    setOriginText(prediction.description)
    setOriginSuggestions([])

    if (!window.google?.maps) return

    const placesService = new window.google.maps.places.PlacesService(
      mapInstance || document.createElement("div")
    )

    placesService.getDetails(
      { placeId: prediction.place_id, fields: ["geometry"] },
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
            setZoom(15)
          }
        }
      }
    )
  }

  const runRoute = origin => {
    if (!selected || !window.google) return

    setIsRouting(true)
    setDirectionsError("")
    // NOTE: clearDirections clears 'activeDirections', removing the blue line
    clearDirections()

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

      if (status === "OK" && result && typeof result === "object" && Array.isArray(result.routes)) {
        // ✅ Sets the active route, which draws the blue line
        setActiveDirections(result)
        
        if (travelMode === "TRANSIT") setIsTransitChoosingRoute(true)

        if (mapInstance && result.routes?.[0]?.bounds) {
          mapInstance.fitBounds(result.routes[0].bounds)
        }
      } else {
        setActiveDirections(null)
        setDirectionsError(
          "Could not find a route – try another mode or move the map."
        )
      }
    })
  }

  const handleGetDirections = () => {
    if (!selected || !mapInstance) return

    // ✅ Update Input Text ONLY when Get Directions is clicked
    setSearchText(selected.name)

    if (originLocation) {
      runRoute(originLocation)
      return
    }

    if (userLocation) {
      runRoute(userLocation)
      if (!originText) setOriginText("Current location")
      return
    }

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
        setZoom(15)

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

  const currentRoute = activeDirections?.routes?.[selectedRouteIndex] || null
  const currentLeg = currentRoute?.legs?.[0] || null

  // ✅ 3. GET STALL IMAGES FROM BACKEND DATA
  const stallImages = useMemo(() => {
    if (!selected || !selected.stalls || !Array.isArray(selected.stalls)) return []
    return selected.stalls
      .filter(s => s.image) // Only take stalls that have an image property
      .slice(0, 3)          // Take top 3
      .map(s => getImageUrl(s.image)) // Format URL
  }, [selected])

  if (!isLoaded) return <div className="p-6">Loading map…</div>
  if (isLoading) return <div className="p-6">Loading hawker centres…</div>

  const upvotes =
    selected?.upvotes ??
    selected?.upvoteCount ??
    selected?.upvote_count ??
    selected?.likes ??
    0

  return (
    <div className="w-full min-h-screen bg-[#F6FBF2]">
      <div className="relative w-full h-[100dvh]">
        <div ref={mapWrapRef} className="absolute inset-0">
          <GoogleMap
            mapContainerStyle={containerStyle}
            defaultCenter={{ lat: 1.3521, lng: 103.8198 }}
            defaultZoom={12}
            onLoad={map => {
              setMapInstance(map)
              const z = map.getZoom()
              if (typeof z === "number") setZoom(z)

              setTimeout(() => {
                if (map) {
                  window.google.maps.event.trigger(map, "resize")
                  const currentCenter = map.getCenter()
                  if (currentCenter) map.setCenter(currentCenter)
                }
              }, 200)
            }}
            onZoomChanged={() => {
              if (!mapInstance) return
              const z = mapInstance.getZoom()
              if (typeof z === "number") setZoom(z)
            }}
            onClick={() => setShowPopup(false)}
            options={{
              mapTypeId: "roadmap",
              mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              clickableIcons: false,
              styles: [
                {
                  featureType: "transit.station.rail",
                  elementType: "labels.icon",
                  stylers: [{ visibility: "off" }]
                }
              ]
            }}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                zIndex={4000}
              />
            )}

            {mapInstance &&
              centres.map(c => (
                <HawkerCentreMarker
                  key={c.id}
                  map={mapInstance}
                  centre={c}
                  isSelected={selected?.id === c.id}
                  isMain={focusedCentre?.id === c.id}
                  zoom={zoom}
                  onClick={() => handleSelectCentre(c, false)}
                />
              ))}

            {/* ✅ REDESIGNED POPUP WINDOW */}
            {selected && showPopup && popupPos && (
              <OverlayView
                position={popupPos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={() => ({ x: -140, y: -260 })}
              >
                <div
                  style={{
                    width: 280,
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: "0 4px 25px rgba(0,0,0,0.25)",
                    background: "white",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "system-ui, -apple-system, sans-serif"
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setShowPopup(false)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.5)",
                      color: "white",
                      border: "none",
                      fontSize: 18,
                      lineHeight: "28px",
                      cursor: "pointer",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>

                  {/* Stall Images (Top 3) */}
                  <div style={{ display: "flex", height: 130, width: "100%", background: "#f3f4f6" }}>
                    {stallImages.length > 0 ? (
                      stallImages.map((img, idx) => (
                        <div key={idx} style={{ flex: 1, borderRight: idx < stallImages.length - 1 ? "1px solid white" : "none" }}>
                          <img 
                            src={img} 
                            alt="Stall" 
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                          />
                        </div>
                      ))
                    ) : (
                      // Fallback if no stall images found in backend data
                      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#e5e7eb", color: "#9ca3af" }}>
                        <span style={{ fontSize: 40 }}>🏪</span>
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", lineHeight: "1.2", marginBottom: 6 }}>
                      {selected.name}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4B5563", marginBottom: 14 }}>
                      <span style={{ fontSize: 14 }}>🚗</span>
                      {previewDistance ? (
                        <span>{previewDistance} by car</span>
                      ) : (
                        <span>
                          {userLocation ? "Calculating..." : "Enter location for distance"}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleGetDirections}
                      disabled={isRouting || isLocating}
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        padding: "10px 0",
                        fontSize: 13,
                        fontWeight: 600,
                        background: "#21421B",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                        opacity: isRouting || isLocating ? 0.7 : 1
                      }}
                    >
                      {isLocating
                        ? "Detecting location..."
                        : isRouting
                        ? "Finding route..."
                        : "Get directions"}
                    </button>
                  </div>
                </div>
              </OverlayView>
            )}
          </GoogleMap>
        </div>

        <div className="absolute left-6 top-6 z-20 max-w-sm w-[430px] bg-white rounded-[24px] shadow-lg p-6">
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D1D5DB] text-sm text-[#21421B] hover:bg-[#F6FBF2]"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-[#21421B]">
              Hawker map{" "}
              <span className="text-xs font-normal text-gray-400">
                ({centres.length} centres)
              </span>
            </h1>
          </div>

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
                autoComplete="off"
              />

              {originSuggestions.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
                  {originSuggestions.map(prediction => (
                    <li key={prediction.place_id}>
                      <button
                        type="button"
                        className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F6FBF2]"
                        onClick={() => handleSelectOriginSuggestion(prediction)}
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

          <div className="relative">
            <input
              type="text"
              placeholder="Search hawker centre"
              className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]"
              value={searchText}
              onChange={handleSearchChange}
              autoComplete="off"
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
                        onClick={() => handleSelectCentre(c, true)}
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {c.name}
                        </span>
                        <span className="text-xs text-gray-500">{c.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>

          <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            {selected ? (
              <>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">{selected.address}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Lat {selected.latitude} Lng {selected.longitude}
                  </p>
                </div>

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
                        clearDirections()
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
                  <p className="mt-2 text-xs text-red-500">{directionsError}</p>
                )}
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">{locationError}</p>
                )}

                {/* Directions Steps (Left Panel) */}
                {travelMode === "TRANSIT" && activeDirections?.routes?.length > 0 && (
                  <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                    {isTransitChoosingRoute ? (
                      <>
                        <p className="text-xs font-semibold text-gray-700">
                          Choose a route
                        </p>
                        <div className="mt-2 max-h-40 space-y-2 overflow-auto pr-1">
                          {activeDirections.routes.map((route, idx) => {
                            const leg = route.legs?.[0]
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
                                  setIsTransitChoosingRoute(false)
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
                      </>
                    ) : (
                      currentLeg && (
                        <div>
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              className="flex items-center text-[11px] text-gray-500"
                              onClick={() => setIsTransitChoosingRoute(true)}
                            >
                              <span className="mr-1">←</span>
                              <span>Back to routes</span>
                            </button>
                            <div className="text-right text-xs text-gray-700">
                              <p className="font-medium">
                                {currentLeg.duration?.text} •{" "}
                                {currentLeg.distance?.text}
                              </p>
                              {currentLeg.departure_time?.text &&
                                currentLeg.arrival_time?.text && (
                                  <p className="text-[11px] text-gray-500">
                                    {currentLeg.departure_time.text} –{" "}
                                    {currentLeg.arrival_time.text}
                                  </p>
                                )}
                            </div>
                          </div>

                          <ul className="mt-3 max-h-40 space-y-1 overflow-auto pr-1 text-sm text-gray-900">
                            {currentLeg.steps.map((step, index) => (
                              <li key={index} className="flex gap-2 pb-3">
                                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#21421B]" />
                                <span>
                                  {step.instructions.replace(/<[^>]+>/g, "")} (
                                  {step.distance.text})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </div>
                )}

                {currentLeg && travelMode !== "TRANSIT" && (
                  <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {currentLeg.duration?.text} • {currentLeg.distance?.text}
                      </p>
                      <button
                        type="button"
                        className="ml-3 text-[11px] text-gray-500 underline"
                        onClick={() => setShowRouteDetails(prev => !prev)}
                      >
                        {showRouteDetails ? "Hide directions" : "Show directions"}
                      </button>
                    </div>

                    {showRouteDetails && (
                      <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1 text-sm text-gray-900">
                        {currentLeg.steps.map((step, index) => (
                          <li key={index} className="flex gap-2 pb-3">
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#21421B]" />
                            <span>
                              {step.instructions.replace(/<[^>]+>/g, "")} (
                              {step.distance.text})
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