import React from 'react'
import {MobileRestriction} from '../components/common/MobileRestriction'

interface MobileRestrictedRouteProps {
    children: React.ReactNode
    feature?: string
}

/**
 * Route wrapper that restricts access on mobile devices
 * Shows a desktop-required message to mobile users
 */
export const MobileRestrictedRoute: React.FC<MobileRestrictedRouteProps> = ({
                                                                                children,
                                                                                feature = "PDF editing and redaction features"
                                                                            }) => {
    return (
        <MobileRestriction feature={feature}>
            {children}
        </MobileRestriction>
    )
}

export default MobileRestrictedRoute 