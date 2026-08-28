"use client";

import type { RoastResult } from "@/lib/roast/types";
import { AlertTriangle, CheckCircle2, Info, XCircle, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

export function RoastResults({ result }: { result: RoastResult }) {
  const {
    stack_score,
    findings,
    improvements,
    resolved_technologies,
    unresolved_technologies,
    assumptions,
  } = result;

  const severityConfig = {
    critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
    high: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    medium: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
    low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    info: { icon: CheckCircle2, color: "text-gray-400", bg: "bg-gray-800", border: "border-gray-700" },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Top Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Stack Score</p>
          <div className="text-5xl font-bold text-white mb-2">
            {stack_score.overall}<span className="text-2xl text-gray-600">/100</span>
          </div>
          <p className="text-sm text-gray-500">Overall architectural quality</p>
        </div>

        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Analysis Confidence</p>
          <div className="text-5xl font-bold text-white mb-2">
            {Math.round(stack_score.confidence * 100)}<span className="text-2xl text-gray-600">%</span>
          </div>
          <p className="text-sm text-gray-500">Based on verifiable technologies</p>
        </div>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Findings</h2>
          <div className="space-y-4">
            {findings.map((finding) => {
              const config = severityConfig[finding.severity] || severityConfig.info;
              const Icon = config.icon;
              return (
                <div key={finding.id} className={clsx("p-5 rounded-lg border", config.bg, config.border)}>
                  <div className="flex items-start gap-4">
                    <Icon className={clsx("w-6 h-6 mt-0.5 shrink-0", config.color)} />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white text-lg">{finding.title}</h3>
                        <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full border", config.color, config.border)}>
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                          {finding.category}
                        </span>
                      </div>

                      <p className="text-gray-300 leading-relaxed">{finding.description}</p>

                      {finding.affected_technologies.length > 0 && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-400 font-medium mb-1">Affected Technologies:</p>
                          <div className="flex flex-wrap gap-2">
                            {finding.affected_technologies.map(tech => (
                              <span key={tech} className="text-xs bg-gray-900 text-gray-300 px-2 py-1 rounded border border-gray-800">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {finding.evidence_basis.length > 0 && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-400 font-medium mb-1">Why it matters:</p>
                          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                            {finding.evidence_basis.map((evidence, i) => (
                              <li key={i}>{evidence}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {finding.suggested_fix && (
                        <div className="pt-3 mt-3 border-t border-gray-700/50">
                          <p className="text-sm text-blue-400 font-medium mb-1">Suggested Fix:</p>
                          <p className="text-sm text-gray-300">{finding.suggested_fix}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Recommended Improvements</h2>
          <div className="grid grid-cols-1 gap-4">
            {improvements.map((improvement, i) => (
              <div key={i} className="bg-gray-950 border border-gray-800 p-5 rounded-lg flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full border border-blue-800/50">
                    {improvement.type}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-white font-medium">
                    {improvement.current_technology && improvement.suggested_technology ? (
                      <span>Replace <span className="text-red-400">{improvement.current_technology}</span> with <span className="text-green-400">{improvement.suggested_technology}</span></span>
                    ) : improvement.current_technology ? (
                      <span>Address <span className="text-orange-400">{improvement.current_technology}</span></span>
                    ) : improvement.suggested_technology ? (
                      <span>Consider <span className="text-green-400">{improvement.suggested_technology}</span></span>
                    ) : (
                      <span>General Improvement</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{improvement.reason}</p>
                  <p className="text-sm text-blue-400 font-medium mt-1">{improvement.expected_benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified vs Unverified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Verified Technologies</h3>
          {resolved_technologies.length > 0 ? (
            <ul className="space-y-2">
              {resolved_technologies.map(tech => (
                <li key={tech.original_name} className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  {tech.normalized_name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">None of the supplied technologies could be verified.</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Unverified Technologies</h3>
          {unresolved_technologies.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded">
                TechNaam could not verify these technologies. They are not necessarily bad, but they reduce our analysis confidence.
              </p>
              <ul className="space-y-2">
                {unresolved_technologies.map(tech => (
                  <li key={tech.original_name} className="flex items-center gap-2 text-sm text-gray-400">
                    <Info className="w-4 h-4 text-gray-500 shrink-0" />
                    {tech.original_name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500">All technologies were verified.</p>
          )}
        </div>
      </div>

      {/* Assumptions */}
      {assumptions.length > 0 && (
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <p className="text-sm font-medium text-gray-400 mb-2">Analysis Assumptions:</p>
          <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
            {assumptions.map((assumption, i) => (
              <li key={i}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
