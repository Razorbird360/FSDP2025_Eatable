import { Outlet } from "react-router-dom";
import { PhotoUploadProvider } from "../context/PhotoUploadContext";

export default function PhotoUploadLayout() {
  return (
    <PhotoUploadProvider>
      <Outlet />
    </PhotoUploadProvider>
  );
}
