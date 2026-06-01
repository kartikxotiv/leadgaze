'use client'
import {
    Activity,
    Building2,
    TrendingUp,
    Users2,
    Settings,
} from 'lucide-react';

const fundraiseRoutes = [
    {
        label: 'Fundraising',
        children: [
            {
                label: 'Overview',
                path: '/home/funds',
                Icon: <Activity className="h-4 w-4" />,
            },
            {
                label: 'Rounds',
                path: '/home/funds/rounds',
                Icon: <TrendingUp className="h-4 w-4" />,
            },
            {
                label: 'Investors',
                path: '/home/funds/investors',
                Icon: <Building2 className="h-4 w-4" />,
            },
            {
                label: 'Deals',
                path: '/home/funds/pipeline',
                Icon: <Users2 className="h-4 w-4" />,
            },
            {
                label: 'Activities',
                path: '/home/funds/activities',
                Icon: <Activity className="h-4 w-4" />,
            },
            {
                label: 'Settings',
                path: '/home/funds/settings',
                Icon: <Settings className="h-4 w-4" />,
            },
        ],
    },
];

export default fundraiseRoutes;
