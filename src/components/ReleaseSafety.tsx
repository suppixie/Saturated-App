import { Ban, Check, EyeOff, Flag, ShieldCheck, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  DatabaseModerationReport,
  ModerationAction,
  ReportReason,
  ReportTargetType,
} from "../../lib/database";
import { C, F } from "../theme";

export type ReportTarget = {
  type: ReportTargetType;
  id: string;
  label: string;
};

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "dangerous_or_illegal", label: "Dangerous or illegal activity" },
  { value: "misinformation", label: "Misleading information" },
  { value: "intellectual_property", label: "Copyright or trademark" },
  { value: "other", label: "Something else" },
];

export function ReportModal({
  target,
  onClose,
  onSubmit,
}: {
  target: ReportTarget | null;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return;
    setReason("spam");
    setDetails("");
    setError("");
  }, [target]);

  const submit = async () => {
    try {
      setBusy(true);
      setError("");
      await onSubmit(reason, details);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send this report. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={Boolean(target)} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.reportCard}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Flag size={18} color={C.red} />
              <Text style={styles.title}>Report {target?.type}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close report form"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={18} color={C.ink} />
            </Pressable>
          </View>
          <Text numberOfLines={2} style={styles.targetLabel}>
            {target?.label}
          </Text>
          <Text style={styles.helper}>
            Reports are private. Saturated moderators review every submission.
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.reasonScroller}
            contentContainerStyle={styles.reasonList}
          >
            {REPORT_REASONS.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === item.value }}
                onPress={() => setReason(item.value)}
                style={[
                  styles.reasonButton,
                  reason === item.value && styles.reasonButtonSelected,
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    reason === item.value && styles.radioSelected,
                  ]}
                />
                <Text style={styles.reasonText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            value={details}
            onChangeText={(value) => setDetails(value.slice(0, 1000))}
            placeholder="Add helpful details (optional)"
            placeholderTextColor="rgba(32,26,27,.5)"
            multiline
            style={styles.detailsInput}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit report"
            disabled={busy}
            onPress={() => void submit()}
            style={styles.primaryButton}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Send report</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function PasswordResetModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setPassword("");
    setConfirmation("");
    setError("");
  }, [visible]);

  const save = async () => {
    if (password.length < 8) {
      setError("Use at least eight characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await onSave(password);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update your password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.passwordCard}>
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.helper}>
            Your password must contain at least eight characters.
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="New password"
            placeholderTextColor="rgba(32,26,27,.5)"
            style={styles.passwordInput}
          />
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Confirm new password"
            placeholderTextColor="rgba(32,26,27,.5)"
            style={styles.passwordInput}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            disabled={busy}
            onPress={() => void save()}
            style={styles.primaryButton}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Save password</Text>
            )}
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function TermsAcceptanceModal({
  visible,
  onOpenTerms,
  onOpenGuidelines,
  onAccept,
}: {
  visible: boolean;
  onOpenTerms: () => void;
  onOpenGuidelines: () => void;
  onAccept: () => Promise<void>;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setChecked(false);
    setError("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.passwordCard}>
          <ShieldCheck size={28} color={C.teal} />
          <Text style={styles.title}>Keep Saturated safe</Text>
          <Text style={styles.helper}>
            Before posting reviews or comments, please accept the Terms and
            Community Guidelines. Reports are reviewed by moderators and abusive
            accounts may be suspended.
          </Text>
          <View style={styles.legalActions}>
            <Pressable onPress={onOpenTerms} style={styles.legalButton}>
              <Text style={styles.legalText}>Read Terms</Text>
            </Pressable>
            <Pressable onPress={onOpenGuidelines} style={styles.legalButton}>
              <Text style={styles.legalText}>Community Guidelines</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => setChecked((current) => !current)}
            style={styles.acceptRow}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Check size={13} color="#fff" />}
            </View>
            <Text style={styles.acceptText}>
              I agree to the Terms and Community Guidelines.
            </Text>
          </Pressable>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            disabled={!checked || busy}
            onPress={() => {
              void (async () => {
                try {
                  setBusy(true);
                  setError("");
                  await onAccept();
                } catch (acceptError) {
                  setError(
                    acceptError instanceof Error
                      ? acceptError.message
                      : "Could not save your acceptance.",
                  );
                } finally {
                  setBusy(false);
                }
              })();
            }}
            style={[
              styles.primaryButton,
              (!checked || busy) && styles.primaryButtonDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Accept and continue</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function ModerationQueueContent({
  reports,
  busyId,
  onRefresh,
  onResolve,
}: {
  reports: DatabaseModerationReport[];
  busyId?: string;
  onRefresh: () => void;
  onResolve: (
    report: DatabaseModerationReport,
    action: ModerationAction,
  ) => void;
}) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.queueContent}
    >
      <View style={styles.queueIntro}>
        <ShieldCheck size={22} color={C.teal} />
        <View style={{ flex: 1 }}>
          <Text style={styles.queueHeading}>Open reports</Text>
          <Text style={styles.helper}>
            Review context carefully. Every action is retained in the audit log.
          </Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      {!reports.length ? (
        <View style={styles.emptyQueue}>
          <Check size={28} color={C.green} />
          <Text style={styles.queueHeading}>No open reports</Text>
          <Text style={styles.helper}>The moderation queue is clear.</Text>
        </View>
      ) : (
        reports.map((report) => {
          const disabled = busyId === report.id;
          return (
            <View key={report.id} style={styles.queueCard}>
              <View style={styles.queueMetaRow}>
                <Text style={styles.queueType}>{report.target_type}</Text>
                <Text style={styles.queueDate}>
                  {new Date(report.created_at).toLocaleDateString("en-GB")}
                </Text>
              </View>
              <Text style={styles.queueHeading}>
                {report.target_user_name || "Unknown user"}
              </Text>
              <Text style={styles.queueReason}>
                {report.reason.replaceAll("_", " ")}
              </Text>
              {!!report.content_preview && (
                <Text style={styles.preview}>{report.content_preview}</Text>
              )}
              {!!report.details && (
                <Text style={styles.reportDetails}>
                  Reporter note: {report.details}
                </Text>
              )}
              <Text style={styles.reporter}>
                Reported by {report.reporter_name}
              </Text>
              <View style={styles.queueActions}>
                <Pressable
                  disabled={disabled}
                  onPress={() => onResolve(report, "hide_content")}
                  style={[styles.actionButton, styles.hideButton]}
                >
                  <EyeOff size={14} color="#fff" />
                  <Text style={styles.actionText}>Hide & resolve</Text>
                </Pressable>
                <Pressable
                  disabled={disabled}
                  onPress={() => onResolve(report, "suspend_user")}
                  style={[styles.actionButton, styles.suspendButton]}
                >
                  <Ban size={14} color="#fff" />
                  <Text style={styles.actionText}>Suspend</Text>
                </Pressable>
                <Pressable
                  disabled={disabled}
                  onPress={() => onResolve(report, "dismiss")}
                  style={[styles.actionButton, styles.dismissButton]}
                >
                  <Text style={[styles.actionText, { color: C.ink }]}>
                    Dismiss
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(32,26,27,.48)",
  },
  reportCard: {
    width: "100%",
    maxWidth: 374,
    maxHeight: "88%",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#fffef8",
  },
  passwordCard: {
    width: "100%",
    maxWidth: 374,
    borderRadius: 24,
    padding: 22,
    gap: 12,
    backgroundColor: "#fffef8",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleCopy: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: F.bold, fontSize: 18, color: C.ink },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,73,89,.08)",
  },
  targetLabel: {
    marginTop: 8,
    fontFamily: F.medium,
    fontSize: 12,
    color: C.red,
  },
  helper: {
    marginTop: 4,
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(32,26,27,.68)",
  },
  reasonScroller: { marginTop: 12, maxHeight: 250 },
  reasonList: { gap: 7 },
  reasonButton: {
    minHeight: 39,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.14)",
    backgroundColor: "rgba(255,255,255,.74)",
  },
  reasonButtonSelected: {
    borderColor: C.red,
    backgroundColor: "rgba(204,36,44,.08)",
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.teal,
  },
  radioSelected: { borderWidth: 4, borderColor: C.red },
  reasonText: { fontFamily: F.medium, fontSize: 11, color: C.ink },
  detailsInput: {
    minHeight: 72,
    maxHeight: 105,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.2)",
    backgroundColor: "#fff",
    fontFamily: F.regular,
    fontSize: 11,
    color: C.ink,
    textAlignVertical: "top",
  },
  passwordInput: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "rgba(43,73,89,.22)",
    backgroundColor: "#fff",
    fontFamily: F.regular,
    color: C.ink,
  },
  error: { marginTop: 8, fontFamily: F.medium, fontSize: 10, color: C.red },
  primaryButton: {
    height: 44,
    marginTop: 12,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.red,
  },
  primaryText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  cancelButton: { height: 34, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: F.medium, fontSize: 11, color: C.teal },
  primaryButtonDisabled: { opacity: 0.45 },
  legalActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legalButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,73,89,.08)",
  },
  legalText: { fontFamily: F.bold, fontSize: 9, color: C.teal },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 4,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: C.greenDark, borderColor: C.greenDark },
  acceptText: {
    flex: 1,
    fontFamily: F.medium,
    fontSize: 10,
    lineHeight: 14,
    color: C.ink,
  },
  queueContent: { paddingHorizontal: 28, paddingBottom: 48, gap: 12 },
  queueIntro: {
    minHeight: 86,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,254,248,.68)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,.75)",
  },
  queueHeading: { fontFamily: F.bold, fontSize: 13, color: C.ink },
  refreshButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.teal,
  },
  refreshText: { fontFamily: F.bold, fontSize: 9, color: "#fff" },
  emptyQueue: {
    minHeight: 170,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,254,248,.58)",
  },
  queueCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "rgba(255,254,248,.78)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,.9)",
  },
  queueMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  queueType: {
    fontFamily: F.bold,
    fontSize: 9,
    textTransform: "uppercase",
    color: C.red,
  },
  queueDate: {
    fontFamily: F.regular,
    fontSize: 9,
    color: "rgba(32,26,27,.55)",
  },
  queueReason: {
    marginTop: 3,
    fontFamily: F.medium,
    fontSize: 10,
    color: C.red,
    textTransform: "capitalize",
  },
  preview: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    fontFamily: F.regular,
    fontSize: 11,
    lineHeight: 16,
    color: C.ink,
    backgroundColor: "rgba(43,73,89,.07)",
  },
  reportDetails: {
    marginTop: 8,
    fontFamily: F.regular,
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(32,26,27,.72)",
  },
  reporter: {
    marginTop: 8,
    fontFamily: F.regular,
    fontSize: 9,
    color: "rgba(32,26,27,.5)",
  },
  queueActions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  actionButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  hideButton: { backgroundColor: C.teal },
  suspendButton: { backgroundColor: C.red },
  dismissButton: { backgroundColor: "rgba(43,73,89,.11)" },
  actionText: { fontFamily: F.bold, fontSize: 9, color: "#fff" },
});
