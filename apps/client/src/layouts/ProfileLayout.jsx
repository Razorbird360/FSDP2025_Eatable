import { Outlet } from 'react-router-dom';
import ProfileSidebar from '../components/ProfileSidebar';

export default function ProfileLayout() {
    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-[#F8FDF3]">
            <ProfileSidebar />
            <main className="flex-1 p-8 bg-[#F8FDF3]">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
