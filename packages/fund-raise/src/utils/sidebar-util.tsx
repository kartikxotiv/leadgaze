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
                path: '/home/fund',
                Icon: <Activity className="h-4 w-4" />,
            },
            {
                label: 'Rounds',
                path: '/home/fund/rounds',
                Icon: <TrendingUp className="h-4 w-4" />,
            },
            {
                label: 'Investors',
                path: '/home/fund/investors',
                Icon: <Building2 className="h-4 w-4" />,
            },
            {
                label: 'Deals',
                path: '/home/fund/pipeline',
                Icon: <Users2 className="h-4 w-4" />,
            },
            {
                label: 'Activities',
                path: '/home/fund/activities',
                Icon: <Activity className="h-4 w-4" />,
            },
            {
                label: 'Settings',
                path: '/home/fund/settings',
                Icon: <Settings className="h-4 w-4" />,
            },
        ],
    },
];

export default fundraiseRoutes;
