import { logout } from '@/app/admin/actions';

function LogoutIcon(props) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </svg>
  );
}

export default function AdminHeader({ title, action, lead = null }) {
  return (
    <header className="admin-header">
      <div className="admin-header__start">
        {lead}
        <div className="admin-header__text">
          <p>لوحة التحكم</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="admin-header__actions">
        {action}
        <form action={logout}>
          <button type="submit" className="btn btn--outline btn--icon" aria-label="تسجيل خروج" title="تسجيل خروج">
            <LogoutIcon />
          </button>
        </form>
      </div>
    </header>
  );
}
