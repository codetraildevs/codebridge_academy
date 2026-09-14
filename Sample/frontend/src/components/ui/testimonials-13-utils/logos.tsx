import type { ComponentProps } from "react";
import {
  Building2,
  GraduationCap,
  Network,
  Code2,
  ClipboardCheck,
  Landmark,
} from "lucide-react";

type LogoProps = ComponentProps<"svg"> & {
  className?: string;
};

function LogoShell({ Icon, label, className, ...props }: LogoProps & { Icon: typeof Building2; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-muted-foreground"
      aria-label={label}
    >
      <Icon className="h-6 w-6" {...props} />
      <span className="text-lg font-semibold tracking-tight">{label}</span>
    </span>
  );
}

export function Logo01({ className, ...props }: LogoProps) {
  return <LogoShell Icon={GraduationCap} label="Qualexas" className={className} {...props} />;
}

export function Logo02({ className, ...props }: LogoProps) {
  return <LogoShell Icon={Network} label="AssessHub" className={className} {...props} />;
}

export function Logo03({ className, ...props }: LogoProps) {
  return <LogoShell Icon={Code2} label="CodeBridge" className={className} {...props} />;
}

export function Logo04({ className, ...props }: LogoProps) {
  return <LogoShell Icon={ClipboardCheck} label="SkillVerify" className={className} {...props} />;
}

export function Logo05({ className, ...props }: LogoProps) {
  return <LogoShell Icon={Building2} label="InnovaWork" className={className} {...props} />;
}

export function Logo06({ className, ...props }: LogoProps) {
  return <LogoShell Icon={Landmark} label="EducateAI" className={className} {...props} />;
}
