import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import hawkerIcon from "../../../assets/icons/hawker-featured.png"
import { useSearchParams, useNavigate } from "react-router-dom"
import { GoogleMap, Marker, OverlayView, useLoadScript } from "@react-google-maps/api"
import { useHawkerCentres } from "../hooks/hawkerMap"

const containerStyle = { width: "100%", height: "100dvh" }
const libraries = ["places", "marker"]

const CURRENT_LOC_OPTION = {
  description: "📍 Current location",
  place_id: "CURRENT_LOCATION_ID"
}

function getImageUrl(imagePath) {
  if (!imagePath) return null
  return imagePath
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
  }, [map, position, position?.lat, position?.lng, title, zIndex, content, onClick])

  return null
}

function HawkerCentreMarker({ map, centre, isSelected, isMain, zoom, onMarkerClick }) {
  const lat = Number(centre?.latitude);
  const lng = Number(centre?.longitude);
  const hasValidPos = Number.isFinite(lat) && Number.isFinite(lng);

  const LABEL_ZOOM_THRESHOLD = 11;
  const showLabel = Boolean(centre) && (isMain || isSelected || (zoom ?? 0) >= LABEL_ZOOM_THRESHOLD);

  const handleClick = useCallback(() => {
    if (!centre) return;
    onMarkerClick?.(centre);
  }, [onMarkerClick, centre]);

  const content = useMemo(() => {
    if (!centre || typeof document === "undefined") return null;

    const wrapper = document.createElement("div");
    wrapper.className = "hawker-marker relative flex items-center justify-center";
    wrapper.style.width = "16px";
    wrapper.style.height = "16px";

    const icon = document.createElement("img");
    icon.src = hawkerIcon;
    icon.style.width = "30px";
    icon.style.height = "30px";
    icon.style.position = "absolute";
    icon.style.left = "50%";
    icon.style.top = "50%";
    icon.style.transform = "translate(-50%, -50%)";
    wrapper.appendChild(icon);

    if (showLabel) {
      const label = document.createElement("div");
      label.className =
        "hawker-label rounded-full px-3 py-1 text-[11px] font-semibold shadow-md border border-white whitespace-nowrap " +
        (isSelected ? "bg-orange-500 text-white" : "bg-green-600 text-white");
      label.textContent = centre.name || "";
      label.style.position = "absolute";
      label.style.left = "18px";
      label.style.top = "50%";
      label.style.transform = "translateY(-50%)";
      wrapper.appendChild(label);
    }

    return wrapper;
  }, [centre, showLabel, isSelected]);

  if (!centre || !hasValidPos) return null;

  return (
    <CustomAdvancedMarker
      map={map}
      position={{ lat, lng }}
      title={centre.name}
      content={content || undefined}
      zIndex={isSelected ? 3000 : isMain ? 2500 : 1000}
      onClick={handleClick}
    />
  );
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

  const [isSheetOpen, setIsSheetOpen] = useState(true)
  const sheetPeekPx = 92 
  const sheetMaxVh = 0.82 
  const sheetRef = useRef(null)

  const originInputRef = useRef(null)
  const searchInputRef = useRef(null)

  const [center, setCenter] = useState({ lat: 1.3521, lng: 103.8198 })
  const [zoom, setZoom] = useState(12)
  const [mapInstance, setMapInstance] = useState(null)
  const [panelSelected, setPanelSelected] = useState(null)
  const [popupSelected, setPopupSelected] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupPos, setPopupPos] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [searchText, setSearchText] = useState("")
  const [isSearchDirty, setIsSearchDirty] = useState(false)
  const [travelMode, setTravelMode] = useState("DRIVING")
  const [activeDirections, setActiveDirections] = useState(null)
  const [directionsError, setDirectionsError] = useState("")
  const [isRouting, setIsRouting] = useState(false)
  const [previewDistance, setPreviewDistance] = useState("")
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState("")
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [showRouteDetails, setShowRouteDetails] = useState(true)
  const [isTransitChoosingRoute, setIsTransitChoosingRoute] = useState(true)
  const [originText, setOriginText] = useState("")
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [originLocation, setOriginLocation] = useState(null)
  const [hasInitialCentered, setHasInitialCentered] = useState(false)
  const directionsRendererInstanceRef = useRef(null)
  const mapWrapRef = useRef(null)

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const forceMapResize = useCallback(map => {
    if (!map || !window.google?.maps?.event) return
    requestAnimationFrame(() => {
      window.google.maps.event.trigger(map, "resize")
      requestAnimationFrame(() => {
        window.google.maps.event.trigger(map, "resize")
        const c = map.getCenter()
        if (c) map.setCenter(c)
      })
    })
  }, [])

  const clearDirections = useCallback(() => {
    setActiveDirections(null)
    setDirectionsError("")
    setSelectedRouteIndex(0)
    setShowRouteDetails(true)
    setIsTransitChoosingRoute(true)

    const r = directionsRendererInstanceRef.current
    if (r) {
      r.setDirections({ routes: [] })
      r.setMap(null)
    }
  }, [])

  const focusedCentre = useMemo(
    () => centres.find(c => String(c.id) === String(centreIdFromUrl)),
    [centres, centreIdFromUrl]
  )

  const baseCentre = focusedCentre || centres[0] || null

  const matchingCentres = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.toLowerCase()
    return centres.filter(c => (c.name || "").toLowerCase().includes(q))
  }, [centres, searchText])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [popupSelected])

  useEffect(() => {
    if (!window.google?.maps || !popupSelected) {
      setPreviewDistance("")
      return
    }

    const origin = originLocation || userLocation
    if (!origin) {
      setPreviewDistance("")
      return
    }

    const dest = { lat: Number(popupSelected.latitude), lng: Number(popupSelected.longitude) }
    if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) {
      setPreviewDistance("")
      return
    }

    const service = new window.google.maps.DirectionsService()
    service.route(
      {
        origin,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0]
          setPreviewDistance(leg.distance?.text || "")
        } else {
          setPreviewDistance("")
        }
      }
    )
  }, [popupSelected, originLocation, userLocation])

  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return

    if (!directionsRendererInstanceRef.current) {
      directionsRendererInstanceRef.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true 
      })
    }

    const renderer = directionsRendererInstanceRef.current
    renderer.setDirections({ routes: [] })
    renderer.setMap(null)

    if (activeDirections) {
      renderer.setMap(mapInstance)
      renderer.setDirections(activeDirections)
      renderer.setRouteIndex(selectedRouteIndex)
    }
  }, [mapInstance, activeDirections, selectedRouteIndex])

  useEffect(() => {
    if (!mapInstance || hasInitialCentered || !baseCentre) return

    const target = {
      lat: Number(baseCentre.latitude),
      lng: Number(baseCentre.longitude) - 0.015
    }

    mapInstance.setCenter(target)
    mapInstance.setZoom(14)
    setCenter(target)
    setZoom(14)
    setHasInitialCentered(true)
    forceMapResize(mapInstance)
  }, [mapInstance, baseCentre, hasInitialCentered, forceMapResize])

  useEffect(() => {
    if (!mapInstance || !mapWrapRef.current) return
    const observer = new ResizeObserver(() => forceMapResize(mapInstance))
    observer.observe(mapWrapRef.current)
    return () => observer.disconnect()
  }, [mapInstance, forceMapResize])

  useEffect(() => {
    if (!focusedCentre) return

    setPanelSelected(focusedCentre)
    setSearchText(focusedCentre.name)
    setIsSearchDirty(false)

    const lat = Number(focusedCentre.latitude)
    const lng = Number(focusedCentre.longitude)

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const pos = { lat, lng }
      setCenter(pos)
      setZoom(14)
      setPopupSelected(focusedCentre)
      setPopupPos(pos)
      setShowPopup(false)
    } else {
      setPopupSelected(null)
      setPopupPos(null)
      setShowPopup(false)
    }

    clearDirections()
  }, [focusedCentre, clearDirections])

  const handleMarkerClick = useCallback(centre => {
    setPopupSelected(centre)
    const lat = Number(centre.latitude)
    const lng = Number(centre.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const pos = { lat, lng }
      setPopupPos(pos)
      setShowPopup(true)
    } else {
      setPopupPos(null)
      setShowPopup(false)
    }
  }, [])

  const handleSelectCentreFromList = useCallback(
    centre => {
      setPanelSelected(centre)
      setPopupSelected(centre)
      setSearchText(centre.name)
      setIsSearchDirty(false)

      const lat = Number(centre.latitude)
      const lng = Number(centre.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const pos = { lat, lng }
        setPopupPos(pos)
        setShowPopup(true)
        if (mapInstance) {
          mapInstance.panTo(pos)
          mapInstance.setZoom(15)
        }
      } else {
        setPopupPos(null)
        setShowPopup(false)
      }
      clearDirections()
      setIsSheetOpen(true)
    },
    [clearDirections, mapInstance]
  )

  const handleOriginFocus = () => {
    if (originText.trim()) {
      setOriginText("")
      setOriginLocation(null)
    }
    setOriginSuggestions([CURRENT_LOC_OPTION])
  }

  const handleOriginChange = e => {
    const value = e.target.value
    setOriginText(value)
    setOriginLocation(null)

    if (!value.trim()) {
      setOriginSuggestions([CURRENT_LOC_OPTION])
      return
    }

    if (!window.google?.maps?.places) {
      setOriginSuggestions([CURRENT_LOC_OPTION])
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
      const googleResults = status === "OK" && predictions ? predictions : []
      setOriginSuggestions([CURRENT_LOC_OPTION, ...googleResults])
    })
  }

  const handleSelectOriginSuggestion = prediction => {
    if (prediction.place_id === CURRENT_LOC_OPTION.place_id) {
      setOriginText("📍 Detecting location...")
      setOriginSuggestions([])

      if (!navigator.geolocation) {
        setLocationError("Geolocation not supported.")
        setOriginText("")
        return
      }

      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        position => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
          setUserLocation(loc)
          setOriginLocation(loc)
          setOriginText("Current location")
          setIsLocating(false)

          if (mapInstance) {
            mapInstance.panTo(loc)
            mapInstance.setZoom(15)
          }
        },
        () => {
          setIsLocating(false)
          setOriginText("")
          setLocationError("Unable to get location.")
        }
      )
      return
    }

    setOriginText(prediction.description)
    setOriginSuggestions([])

    if (!window.google?.maps) return

    const placesService = new window.google.maps.places.PlacesService(mapInstance || document.createElement("div"))

    placesService.getDetails({ placeId: prediction.place_id, fields: ["geometry"] }, (place, status) => {
      if (status === "OK" && place?.geometry?.location) {
        const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
        setOriginLocation(loc)
        setUserLocation(loc)
        setCenter(loc)

        if (mapInstance) {
          mapInstance.panTo(loc)
          mapInstance.setZoom(15)
        }
      }
    })
  }

  const runRoute = (origin, destCentre) => {
    const target = destCentre || panelSelected
    if (!target || !window.google) return

    setIsRouting(true)
    setDirectionsError("")
    clearDirections()

    const dest = { lat: Number(target.latitude), lng: Number(target.longitude) }
    if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) {
      setIsRouting(false)
      setDirectionsError("Destination has invalid coordinates.")
      return
    }

    const request = {
      origin,
      destination: dest,
      travelMode: window.google.maps.TravelMode[travelMode]
    }

    if (travelMode === "TRANSIT") {
      request.provideRouteAlternatives = true
      request.transitOptions = {
        departureTime: new Date(),
        modes: [window.google.maps.TransitMode.BUS, window.google.maps.TransitMode.RAIL]
      }
    }

    const service = new window.google.maps.DirectionsService()
    service.route(request, (result, status) => {
      setIsRouting(false)

      if (status === "OK" && result && Array.isArray(result.routes)) {
        setActiveDirections(result)
        if (travelMode === "TRANSIT") setIsTransitChoosingRoute(true)

        if (mapInstance && result.routes?.[0]?.bounds) {
          mapInstance.fitBounds(result.routes[0].bounds)
        }
      } else {
        setActiveDirections(null)
        setDirectionsError("Could not find a route – try another mode or move the map.")
      }
    })
  }

  const handleGetDirectionsFromPopup = () => {
    if (!popupSelected || !mapInstance) return

    setShowPopup(false)
    setPanelSelected(popupSelected)
    setSearchText(popupSelected.name)
    setIsSearchDirty(false)
    clearDirections()
    setIsSheetOpen(true)

    if (originLocation) {
      runRoute(originLocation, popupSelected)
      return
    }

    if (userLocation) {
      runRoute(userLocation, popupSelected)
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
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude }
        setUserLocation(loc)
        setOriginLocation(loc)
        setOriginText("Current location")
        setIsLocating(false)

        setCenter(loc)
        mapInstance.panTo(loc)
        mapInstance.setZoom(15)

        runRoute(loc, popupSelected)
      },
      () => {
        setIsLocating(false)
        setLocationError("Unable to get your location. Check browser permissions.")
      }
    )
  }

  const handleSearchChange = e => {
    const value = e.target.value
    setSearchText(value)
    setIsSearchDirty(true)
  }

  const stallImages = useMemo(() => {
    if (!popupSelected?.stalls || !Array.isArray(popupSelected.stalls)) return []
    const pickImage = stall =>
      stall?.image || stall?.imageUrl || stall?.image_url || stall?.photo || 
      stall?.photoUrl || stall?.photo_url || stall?.thumbnail || 
      stall?.thumbnailUrl || stall?.thumbnail_url || null

    return popupSelected.stalls
      .map(s => pickImage(s))
      .filter(Boolean)
      .slice(0, 5)
      .map(p => getImageUrl(p))
  }, [popupSelected])


  const currentRoute = activeDirections?.routes?.[selectedRouteIndex] || null
  const currentLeg = currentRoute?.legs?.[0] || null
  const heroImage = stallImages[activeImageIndex] || stallImages[0] || null

  if (!isLoaded) return <div className="p-6">Loading map…</div>
  if (isLoading) return <div className="p-6">Loading hawker centres…</div>

  // --- UI FRAGMENTS ---

  const menuHeaderDesktop = (
    <div className="mb-6 flex items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D1D5DB] text-sm text-[#21421B] hover:bg-[#F6FBF2]"
      >
        ←
      </button>
      <h1 className="text-3xl font-bold text-[#21421B]">
        Hawker map <span className="text-sm font-normal text-gray-400">({centres.length} centres)</span>
      </h1>
    </div>
  )

  const menuBody = (
    <>
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold text-gray-700">Your location</label>
        <div className="relative">
          <input
            ref={originInputRef}
            type="text"
            placeholder="Enter your location or address"
            className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]"
            value={originText}
            onChange={handleOriginChange}
            onFocus={handleOriginFocus}
            autoComplete="off"
          />

          {originSuggestions.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
              {originSuggestions.map(prediction => (
                <li key={prediction.place_id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F6FBF2]"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      originInputRef.current?.blur()
                      searchInputRef.current?.blur()
                      handleSelectOriginSuggestion(prediction)
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      originInputRef.current?.blur()
                      searchInputRef.current?.blur()
                      handleSelectOriginSuggestion(prediction)
                    }}
                  >
                    <span className="text-sm text-gray-900">{prediction.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search hawker centre"
          className="w-full rounded-xl border border-[#D1D5DB] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21421B]"
          value={searchText}
          onChange={handleSearchChange}
          autoComplete="off"
        />

        {isSearchDirty && searchText.trim() !== "" && matchingCentres.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-lg">
            {matchingCentres.map(c => (
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-4 py-2 text-left hover:bg-[#F6FBF2]"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    originInputRef.current?.blur()
                    searchInputRef.current?.blur()
                    handleSelectCentreFromList(c)
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    originInputRef.current?.blur()
                    searchInputRef.current?.blur()
                    handleSelectCentreFromList(c)
                  }}
                >
                  <span className="text-sm font-semibold text-gray-900">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
        {panelSelected ? (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{panelSelected.name}</h2>
              <p className="mt-1 text-sm text-gray-600">{panelSelected.address}</p>
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
                    travelMode === option.key ? "bg-[#21421B] text-white border-[#21421B]" : "bg-white text-gray-700 border-[#D1D5DB]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.matchMedia("(max-width: 767px)").matches) {
                  originInputRef.current?.blur()
                  searchInputRef.current?.blur()
                  if (document.activeElement?.blur) document.activeElement.blur()
                }

                if (!panelSelected) return
                const o = originLocation || userLocation
                if (!o) {
                  setLocationError("Set your origin above, or allow location access.")
                  return
                }
                runRoute(o, panelSelected)
              }}
              disabled={isRouting || isLocating}
              className="mt-4 w-full rounded-xl bg-[#21421B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3416] disabled:opacity-60"
            >
              {isRouting ? "Finding route…" : "Re-route to selected"}
            </button>

            {directionsError && <p className="mt-2 text-xs text-red-500">{directionsError}</p>}
            {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}

            {/* TRANSIT MODE UI (Public Transport) */}
            {travelMode === "TRANSIT" && activeDirections?.routes?.length > 0 && (
              <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                {isTransitChoosingRoute ? (
                  <>
                    <p className="text-xs font-semibold text-gray-700">Choose a route</p>
                    <div className="mt-2 max-h-40 space-y-2 overflow-auto pr-1">
                      {activeDirections.routes.map((route, idx) => {
                        const leg = route.legs?.[0]
                        if (!leg) return null

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
                              idx === selectedRouteIndex
                                ? "border-[#21421B] bg-[#F6FBF2]"
                                : "border-[#E5E7EB] bg-white"
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">
                                {duration} • {distance}
                              </span>
                              {modeSummary && (
                                <span className="mt-1 text-[11px] text-gray-600">{modeSummary}</span>
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
                            {currentLeg.duration?.text} • {currentLeg.distance?.text}
                          </p>
                          {currentLeg.departure_time?.text && currentLeg.arrival_time?.text && (
                            <p className="text-[11px] text-gray-500">
                              {currentLeg.departure_time.text} – {currentLeg.arrival_time.text}
                            </p>
                          )}
                        </div>
                      </div>

                      <ul className="mt-3 max-h-40 space-y-1 overflow-auto pr-1 text-sm text-gray-900">
                        {currentLeg.steps.map((step, index) => (
                          <li key={index} className="flex gap-2 pb-3">
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#21421B]" />
                            <span>{step.instructions.replace(/<[^>]+>/g, "")} ({step.distance.text})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            )}

            {/* DRIVING/WALKING MODE UI */}
            {currentLeg && travelMode !== "TRANSIT" && (
              <div className="mt-4 border-t border-[#E5E7EB] pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{currentLeg.duration?.text} • {currentLeg.distance?.text}</p>
                  <button type="button" className="text-[11px] text-gray-500 underline" onClick={() => setShowRouteDetails(prev => !prev)}>
                    {showRouteDetails ? "Hide directions" : "Show directions"}
                  </button>
                </div>
                {showRouteDetails && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1 text-sm text-gray-900">
                    {currentLeg.steps.map((step, index) => (
                      <li key={index} className="flex gap-2 pb-3">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#21421B]" />
                        <span>{step.instructions.replace(/<[^>]+>/g, "")} ({step.distance.text})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">Search for a hawker centre or click a marker to begin.</p>
        )}
      </div>
    </>
  )

  const POPUP_WIDTH_VAL = 280
  const POPUP_HEIGHT = 260
  const MARKER_HEIGHT = 30
  const GAP = 12


  return (
    <div className={`w-full min-h-screen bg-[#F6FBF2] ${showPopup ? "popup-open" : ""}`}>
      <style>
        {`
          .popup-open .hawker-label { opacity: 0; transition: opacity 120ms ease; }
          .recenter-btn {
             position: absolute; right: 20px; bottom: 120px; z-index: 10;
             background: white; border-radius: 50%; width: 48px; height: 48px;
             display: flex; align-items: center; justify-content: center;
             box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: none; cursor: pointer;
          }
          @media (min-width: 768px) { .recenter-btn { bottom: 30px; } }
        `}
      </style>

      <div className="relative w-full h-[100dvh]">
        <div ref={mapWrapRef} className="absolute inset-0">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            onLoad={map => { setMapInstance(map); forceMapResize(map); }}
            onZoomChanged={() => {
              if (!mapInstance) return;
              const z = mapInstance.getZoom();
              if (typeof z === "number") setZoom(z);
            }}
            onClick={() => {
              setShowPopup(false);
              if (window.matchMedia("(max-width: 767px)").matches) setIsSheetOpen(false);
            }}
            options={{
              mapTypeId: "roadmap",
              mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
              mapTypeControl: false,
              fullscreenControl: false,
              streetViewControl: false,
              clickableIcons: false
            }}
          >
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                  scale: 7
                }}
                zIndex={4000}
              />
            )}

            {mapInstance && centres.map(c => (
              <HawkerCentreMarker
                key={c.id}
                map={mapInstance}
                centre={c}
                isSelected={panelSelected?.id === c.id}
                isMain={focusedCentre?.id === c.id}
                zoom={zoom}
                onMarkerClick={handleMarkerClick}
              />
            ))}

            {popupSelected && showPopup && popupPos && (
              <OverlayView
                position={popupPos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={() => ({ x: -(POPUP_WIDTH_VAL / 2), y: -(POPUP_HEIGHT + MARKER_HEIGHT + GAP) })}
              >
                <div style={{ width: POPUP_WIDTH_VAL, borderRadius: 12, zIndex: 5000, overflow: "hidden", boxShadow: "0 4px 25px rgba(0,0,0,0.25)", background: "white", position: "relative", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }} onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => setShowPopup(false)} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "white", border: "none", fontSize: 18, cursor: "pointer", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  <div style={{ height: 150, width: "100%", backgroundColor: "#e5e7eb", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "100%", backgroundImage: heroImage ? `url(${heroImage})` : "none", backgroundSize: "cover", backgroundPosition: "center", transition: "background-image 0.3s ease" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />
                  </div>
                  <div style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{popupSelected.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4B5563", marginBottom: 14 }}>
                      <span>🚗 {previewDistance || "Calculating..."}</span>
                    </div>
                    <button type="button" onClick={handleGetDirectionsFromPopup} style={{ width: "100%", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, background: "#21421B", color: "white", border: "none", cursor: "pointer" }}>Get directions</button>
                  </div>
                </div>
              </OverlayView>
            )}
          </GoogleMap>

          <button className="recenter-btn" onClick={() => userLocation && mapInstance?.panTo(userLocation)}>
            <span style={{ fontSize: '20px' }}>🎯</span>
          </button>
        </div>

        {/* DESKTOP SIDE MENU */}
        <div className="absolute left-6 top-6 z-20 hidden md:block max-w-sm w-[430px] bg-white rounded-[24px] shadow-lg p-6 max-h-[90vh] overflow-y-auto">
          {menuHeaderDesktop}
          {menuBody}
        </div>

        {/* MOBILE BOTTOM SHEET */}
        <div className="absolute inset-x-0 bottom-0 z-30 md:hidden">
          <div
            ref={sheetRef}
            className="mx-3 overflow-hidden rounded-t-[24px] border border-[#E5E7EB] bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)]"
            style={{
              height: isSheetOpen ? `min(${Math.round(sheetMaxVh * 100)}vh, 680px)` : `${sheetPeekPx}px`,
              transition: "height 240ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <button
              type="button"
              onClick={() => setIsSheetOpen((p) => !p)}
              className="w-full px-4 pt-3 pb-2 focus:outline-none"
              aria-expanded={isSheetOpen}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-[#D1D5DB]" />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-[#21421B]">Hawker map</span>
                </div>
                <span className="text-xs text-gray-500">{isSheetOpen ? "Swipe down" : "Swipe up"}</span>
              </div>
            </button>

            <div
              className="px-4 pb-20"
              style={{
                height: `calc(100% - 56px)`,
                overflowY: isSheetOpen ? "auto" : "hidden",
              }}
            >
              {menuBody}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}