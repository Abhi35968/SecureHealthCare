import { useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/secure-logo.svg";
import { useAuth } from "../context/AuthContext";

const navLinks = [
	{ path: "/dashboard", label: "Dashboard" },
	{ path: "/upload", label: "Upload" },
	{ path: "/security", label: "Security" },
];

export default function Navbar() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const initials = useMemo(() => {
		if (!user?.name) return "SH";
		return user.name
			.split(" ")
			.map((part) => part[0])
			.join("")
			.substring(0, 2)
			.toUpperCase();
	}, [user?.name]);

	const roleLabel = user?.role ? user.role : "patient";
	const currentSection = navLinks.find((link) => location.pathname.startsWith(link.path))?.label || "Workspace";

	const handleLogout = () => {
		logout();
		navigate("/");
	};

	return (
		<header className="nav-shell">
			<div className="nav-inner">
				<div className="nav-left">
					<button className="brand" type="button" onClick={() => navigate("/dashboard")}>
						<img src={logo} alt="SecureHealth" />
						<div>
							<strong>SecureHealth</strong>
							<span>Care delivery workspace</span>
						</div>
					</button>
					<p className="nav-subtitle">{currentSection}</p>
				</div>

				<nav className="nav-links" aria-label="Primary navigation">
					{navLinks.map((link) => (
						<NavLink
							key={link.path}
							to={link.path}
							className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
						>
							{link.label}
						</NavLink>
					))}
				</nav>

				<div className="nav-right">
					<button className="nav-outline" type="button" onClick={() => navigate("/upload")}>
						Upload record
					</button>
					<div className="nav-user">
						<span className="nav-avatar">{initials}</span>
						<div className="nav-user-info">
							<strong>{user?.name || "Authenticated user"}</strong>
							<small>{roleLabel}</small>
						</div>
						<button className="nav-chip" type="button" onClick={handleLogout}>
							Logout
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
