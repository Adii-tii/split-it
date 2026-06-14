import { useSelector } from "react-redux";

export const ROLE_PERMISSIONS = {
    viewer: {
        canCreateUsers: false,
        canUpdateUsers: false,
        canDeleteUsers: false,
        canViewUsers: true,
        canCreateGroups: false,
        canUpdateGroups: false,
        canDeleteGroups: false,
        canViewGroups: true,
    },
    manager: {
        canCreateUsers: true,
        canUpdateUsers: true,
        canDeleteUsers: false,
        canViewUsers: true,
        canCreateGroups: true,
        canUpdateGroups: true,
        canDeleteGroups: false,
        canViewGroups: true,
    },
    admin: {
        canCreateUsers: true,
        canUpdateUsers: true,
        canDeleteUsers: true,
        canViewUsers: true,
        canCreateGroups: true,
        canUpdateGroups: true,
        canDeleteGroups: true,
        canViewGroups: true,
    }
};

export const usePermission = () => {
    const user = useSelector((state) => state.userDetails);
    return ROLE_PERMISSIONS[user?.role] || {};
};
