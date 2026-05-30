'use client'
import {
    Activity,
    Calendar,
    FileText,
    Building2,
    TrendingUp,
    Users2,
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
                path: '/home/fund/deals',
                Icon: <Users2 className="h-4 w-4" />,
            },
            {
                label: 'Meetings',
                path: '/home/fund/meetings',
                Icon: <Calendar className="h-4 w-4" />,
            },
            {
                label: 'Documents',
                path: '/home/fund/documents',
                Icon: <FileText className="h-4 w-4" />,
            },
        ],
    },
];

export default fundraiseRoutes;