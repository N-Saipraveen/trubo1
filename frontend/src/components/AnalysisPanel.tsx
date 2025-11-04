import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useStore } from '@/store/useStore';
import { Database, Layers, Link, Hash, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function AnalysisPanel() {
  const { analysis } = useStore();

  if (!analysis) {
    return null;
  }

  const stats = [
    {
      icon: Database,
      label: 'Type',
      value: analysis.type.toUpperCase(),
      color: 'text-blue-500',
    },
    {
      icon: Layers,
      label: analysis.structure.tables ? 'Tables' : 'Collections',
      value: analysis.structure.tables || analysis.structure.collections || 0,
      color: 'text-purple-500',
    },
    {
      icon: Link,
      label: 'Relationships',
      value: analysis.structure.relationships,
      color: 'text-green-500',
    },
    {
      icon: Hash,
      label: 'Indexes',
      value: analysis.structure.indexes,
      color: 'text-amber-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Schema Analysis
          {analysis.quality.hasConstraints && analysis.quality.hasIndexes ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50"
            >
              <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quality Indicators */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Quality Indicators</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {analysis.quality.hasConstraints ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm">
                {analysis.quality.hasConstraints ? 'Has constraints' : 'No constraints defined'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.quality.hasIndexes ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm">
                {analysis.quality.hasIndexes ? 'Has indexes' : 'No indexes defined'}
              </span>
            </div>
            {analysis.quality.normalizedLevel !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  Normalization Level: {analysis.quality.normalizedLevel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {analysis.suggestions && analysis.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Suggestions</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.suggestions.map((suggestion: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
