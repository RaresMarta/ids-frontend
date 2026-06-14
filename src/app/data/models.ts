import { Brain, TreeDeciduous, type LucideIcon } from 'lucide-react';

export interface ClassifierModel {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  params: string;
  color: string;
  metrics: {
    testAccuracy: number;
    testWeightedF1: number;
    testMacroF1: number;
    valWeightedF1: number;
    valMacroF1: number;
  };
}

// 8-class granularity of CIC-IoT-2023 (see labels.py in cic-iot2023-detection-system).
export const ATTACK_CLASSES = ['Benign', 'DDoS', 'DoS', 'Mirai', 'Recon', 'Spoofing', 'Web', 'BruteForce'];

// Mid-tone family palette that stays legible on both the light canvas and the
// dark surface (matches the --attack-* tokens in theme.css).
export const ATTACK_COLORS: Record<string, string> = {
  Benign: '#2E9E5B',
  DDoS: '#C0392B',
  DoS: '#D9743A',
  Mirai: '#7C5CC4',
  Recon: '#3E7CB1',
  Spoofing: '#B5487E',
  Web: '#C27A45',
  BruteForce: '#B8923A',
};

// Classes the live demo exercises. Web and BruteForce are deliberately excluded:
// transport-layer flow features carry too little application-layer signal for them.
export const DEMO_CLASSES = ['Benign', 'DDoS', 'DoS', 'Mirai', 'Recon'];

// Metrics: temporal split (train = earliest 70%, test = latest 15%), 8-class task,
// 25-feature set — thesis report chapter 5, model comparison table.
export const MODELS: ClassifierModel[] = [
  {
    id: 'mlp',
    name: 'MLP Neural Network',
    icon: Brain,
    description: 'PyTorch MLP with BatchNorm, Dropout and class-weighted cross-entropy. Primary model serving the demo.',
    params: '25 → 128 → 64 → 8',
    color: '#5f8dd3',
    metrics: { testAccuracy: 0.698, testWeightedF1: 0.733, testMacroF1: 0.534, valWeightedF1: 0.757, valMacroF1: 0.6 },
  },
  {
    id: 'rf',
    name: 'Random Forest',
    icon: TreeDeciduous,
    description: 'Scikit-learn ensemble baseline trained on the same temporal split and feature set.',
    params: 'n_estimators=200, depth=20',
    color: '#3aa17e',
    metrics: { testAccuracy: 0.75, testWeightedF1: 0.771, testMacroF1: 0.584, valWeightedF1: 0.808, valMacroF1: 0.659 },
  },
];

// MLP per-class F1 on the temporal 8-class test set, computed from the saved
// predictions in models/run_artifacts_temporal_8class.joblib. Per-class numbers
// for the tree baselines were not persisted, so only the MLP breakdown is shown.
export const MLP_PER_CLASS_F1: Record<string, number> = {
  Benign: 0.466,
  DDoS: 0.785,
  DoS: 0.47,
  Mirai: 0.993,
  Recon: 0.665,
  Spoofing: 0.604,
  Web: 0.153,
  BruteForce: 0.134,
};
