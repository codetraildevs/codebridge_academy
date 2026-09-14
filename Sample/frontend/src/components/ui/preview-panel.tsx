import { Award, Users, BarChart3, CheckCircle2, TrendingUp, Shield } from 'lucide-react';

export function PreviewPanel() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[#b8b8b8]/20 bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#000100]">
            <span className="text-[11px] font-bold text-white">Q</span>
          </div>
          <span className="text-[13px] font-semibold text-[#000100]">Qualexas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#dc2626]" />
          <div className="h-2 w-2 rounded-full bg-[#d97706]" />
          <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* Welcome banner */}
        <div className="mb-5 rounded-lg bg-[#000100] p-4">
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Welcome back</p>
          <p className="mt-1 text-[15px] font-semibold text-white">Your competency dashboard</p>
          <p className="mt-0.5 text-[12px] text-white/60">Track your skills and certifications</p>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { icon: Award, label: 'Certificates', value: '12', color: 'text-[#0A0A3B]' },
            { icon: BarChart3, label: 'Avg. Score', value: '87%', color: 'text-[#000100]' },
            { icon: Users, label: 'Ranking', value: 'Top 5%', color: 'text-[#0A0A3B]' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-white p-3">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="mt-2 text-[18px] font-semibold text-[#000100]">{stat.value}</p>
              <p className="text-[11px] text-[#b8b8b8]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity chart mock */}
        <div className="mb-5 rounded-lg bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#000100]">Assessment activity</p>
            <span className="text-[11px] text-[#b8b8b8]">Last 7 days</span>
          </div>
          <div className="mt-3 flex items-end gap-1.5" style={{ height: 64 }}>
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-[#000100]/10 transition-all"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#b8b8b8]">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Recent assessments */}
        <div className="rounded-lg bg-white p-4">
          <p className="text-[12px] font-medium text-[#000100]">Recent assessments</p>
          <div className="mt-3 space-y-2.5">
            {[
              { name: 'Software Engineering', score: 92, passed: true },
              { name: 'Data Structures', score: 78, passed: true },
              { name: 'Network Security', score: 65, passed: false },
            ].map((a) => (
              <div key={a.name} className="flex items-center gap-3 rounded-md border border-[#b8b8b8]/20 p-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${a.passed ? 'bg-[#000100]/5' : 'bg-[#dc2626]/5'}`}>
                  {a.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#000100]" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 text-[#dc2626]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#000100] truncate">{a.name}</p>
                  <p className="text-[11px] text-[#b8b8b8]">Score: {a.score}%</p>
                </div>
                <span className={`text-[11px] font-medium ${a.passed ? 'text-[#000100]' : 'text-[#dc2626]'}`}>
                  {a.passed ? 'Passed' : 'Review'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#b8b8b8]/20 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] text-[#b8b8b8]">
          <Shield className="h-3 w-3" />
          <span>TVET Certified Platform</span>
          <span className="mx-1">·</span>
          <span>Made in Rwanda</span>
        </div>
      </div>
    </div>
  );
}
