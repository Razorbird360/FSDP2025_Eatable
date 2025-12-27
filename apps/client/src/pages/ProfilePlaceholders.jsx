import React from "react";

const PlaceholderPage = ({ title, description }) => (
  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center text-center">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
      <span className="text-3xl">🚧</span>
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
    <p className="text-gray-500 max-w-md">{description}</p>
  </div>
);

export const VouchersPage = () => (
  <PlaceholderPage
    title="Vouchers"
    description="Your collected vouchers and discounts will appear here. Stay tuned for exciting deals!"
  />
);

export const AchievementsPage = () => (
  <PlaceholderPage
    title="Achievements"
    description="Track your foodie journey and unlock badges as you explore more cuisines."
  />
);

export const SpendingsPage = () => (
  <PlaceholderPage
    title="Spendings"
    description="View your total spending, recent purchases, and insights into your food expenses here."
  />
);

export const SettingsPage = () => (
  <PlaceholderPage
    title="Settings"
    description="Manage your account preferences, notifications, and privacy settings."
  />
);

export const BusinessPage = () => (
  <PlaceholderPage
    title="For Business"
    description="Interested in partnering with us? Manage your business profile and stalls here."
  />
);

export const HelpPage = () => (
  <PlaceholderPage
    title="Help Center"
    description="Need assistance? Find FAQs and support contact information here."
  />
);
