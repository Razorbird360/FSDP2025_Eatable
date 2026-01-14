import { Link } from 'react-router-dom';

const overviewCards = [
  {
    title: 'User Moderation',
    description: 'Review flagged accounts and trust signals.',
    to: '/admin/moderation/users',
    action: 'Open queue',
  },
  {
    title: 'Media Review',
    description: 'Approve or reject uploads before they go live.',
    to: '/admin/moderation/media',
    action: 'Review uploads',
  },
  {
    title: 'Reports Triage',
    description: 'Resolve or dismiss reports from the community.',
    to: '/admin/moderation/reports',
    action: 'Triage reports',
  },
  {
    title: 'Vouchers',
    description: 'Manage voucher templates and expiry rules.',
    to: '/admin/vouchers',
    action: 'Manage vouchers',
  },
  {
    title: 'Achievements',
    description: 'Create milestones and assign rewards.',
    to: '/admin/achievements',
    action: 'Manage achievements',
  },
];

const quickActions = [
  {
    label: 'Pending reports',
    note: 'Review safety reports and take action.',
    to: '/admin/moderation/reports',
  },
  {
    label: 'Pending uploads',
    note: 'Approve media before it appears publicly.',
    to: '/admin/moderation/media',
  },
  {
    label: 'Reward setup',
    note: 'Create new vouchers and achievement rewards.',
    to: '/admin/vouchers',
  },
  {
    label: 'Achievements',
    note: 'Tune milestones and reward links.',
    to: '/admin/achievements',
  },
];

export default function AdminHomePage() {
  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Admin Overview</p>
        <h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500">
          Jump into moderation queues or tune rewards for the community.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gray-200"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{action.label}</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">Open workspace</p>
            <p className="text-xs text-gray-500">{action.note}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {overviewCards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm flex flex-col gap-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
            <Link
              to={card.to}
              className="inline-flex items-center justify-center rounded-full bg-[#21421B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1B3C18] w-fit"
            >
              {card.action}
            </Link>
          </div>
        ))}
      </section>
    </section>
  );
}
