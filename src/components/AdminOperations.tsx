import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, Copy, RefreshCw, Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  CatalogueLifecycle,
  DatabaseAdminBeverage,
  DatabaseAdminDrinkRequest,
  loadAdminCatalogue,
  loadAdminDrinkRequests,
  resolveAdminDrinkRequest,
  updateAdminBeverage,
} from "../../lib/database";
import { C, F } from "../theme";

type Tab = "requests" | "catalogue";

function requesterName(request: DatabaseAdminDrinkRequest) {
  const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
  return profile?.display_name || profile?.username || "Saturated member";
}

export function AdminOperationsContent() {
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<DatabaseAdminDrinkRequest[]>([]);
  const [beverages, setBeverages] = useState<DatabaseAdminBeverage[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string>();
  const [duplicateTargets, setDuplicateTargets] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const [requestRows, beverageRows] = await Promise.all([
        loadAdminDrinkRequests(),
        loadAdminCatalogue(),
      ]);
      setRequests(requestRows);
      setBeverages(beverageRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load admin operations.");
    }
  }, []);

  useEffect(() => void refresh(), [refresh]);

  const filteredBeverages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = normalized
      ? beverages.filter((item) =>
          [item.name, item.brand || "", item.category, item.id]
            .join(" ")
            .toLowerCase()
            .includes(normalized),
        )
      : beverages;
    return rows.sort((a, b) => {
      const priority = (item: DatabaseAdminBeverage) =>
        item.lifecycle_status === "draft" ? 0 : item.lifecycle_status === "active" ? 2 : 1;
      return priority(a) - priority(b) || a.name.localeCompare(b.name);
    });
  }, [beverages, query]);

  const updateBeverage = async (
    beverage: DatabaseAdminBeverage,
    status: CatalogueLifecycle,
  ) => {
    const duplicateOf = duplicateTargets[beverage.id]?.trim();
    if (status === "duplicate" && !duplicateOf) {
      Alert.alert("Canonical drink required", "Enter the ID of the drink this record duplicates.");
      return;
    }
    try {
      setBusyId(beverage.id);
      await updateAdminBeverage({ beverageId: beverage.id, status, duplicateOf });
      await refresh();
    } catch (updateError) {
      Alert.alert("Could not update drink", updateError instanceof Error ? updateError.message : "Try again.");
    } finally {
      setBusyId(undefined);
    }
  };

  const resolveRequest = async (
    request: DatabaseAdminDrinkRequest,
    status: "approved" | "rejected",
  ) => {
    try {
      setBusyId(request.id);
      await resolveAdminDrinkRequest({ requestId: request.id, status });
      await refresh();
    } catch (resolveError) {
      Alert.alert("Could not resolve request", resolveError instanceof Error ? resolveError.message : "Try again.");
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["requests", "catalogue"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            accessibilityLabel={`${item === "requests" ? "Drink requests" : "Catalogue"} admin tab`}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === "requests" ? "Drink requests" : "Catalogue"}
            </Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh admin data" onPress={() => void refresh()} style={styles.refresh}>
          <RefreshCw size={17} color={C.teal} />
        </Pressable>
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {tab === "requests" ? (
        <>
          <Text style={styles.helper}>Approve or reject member requests. Approval records the decision; add the catalogue entry separately after verification.</Text>
          {requests.filter((item) => item.status === "pending").length ? (
            requests.filter((item) => item.status === "pending").map((request) => (
              <View key={request.id} style={styles.card}>
                <Text style={styles.title}>{request.drink_name}</Text>
                <Text style={styles.meta}>Requested by {requesterName(request)} · {new Date(request.created_at).toLocaleDateString("en-GB")}</Text>
                <View style={styles.actions}>
                  <Pressable disabled={busyId === request.id} accessibilityRole="button" accessibilityLabel={`Approve ${request.drink_name}`} onPress={() => void resolveRequest(request, "approved")} style={[styles.action, styles.approve]}>
                    <Check size={14} color="#fff" /><Text style={styles.actionLight}>Approve</Text>
                  </Pressable>
                  <Pressable disabled={busyId === request.id} accessibilityRole="button" accessibilityLabel={`Reject ${request.drink_name}`} onPress={() => void resolveRequest(request, "rejected")} style={[styles.action, styles.reject]}>
                    <X size={14} color="#fff" /><Text style={styles.actionLight}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}><Text style={styles.title}>No pending drink requests</Text></View>
          )}
        </>
      ) : (
        <>
          <View style={styles.searchBox}>
            <Search size={18} color={C.teal} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search catalogue" placeholderTextColor="rgba(32,26,27,.48)" style={styles.searchInput} />
          </View>
          <Text style={styles.helper}>Drafts need approval. Discontinued drinks remain visible for history; duplicate and archived records are removed from discovery.</Text>
          {filteredBeverages.map((beverage) => (
            <View key={beverage.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{beverage.name}</Text>
                  <Text style={styles.meta}>{beverage.category}{beverage.brand ? ` · ${beverage.brand}` : ""}</Text>
                </View>
                <Text style={[styles.status, styles[`status_${beverage.lifecycle_status}`]]}>{beverage.lifecycle_status}</Text>
              </View>
              <Text style={styles.idText}>{beverage.id}</Text>
              {!!beverage.potential_duplicate_ids?.length && (
                <Text accessibilityRole="alert" style={styles.duplicateWarning}>
                  Possible duplicate: {beverage.potential_duplicate_ids.join(", ")}
                </Text>
              )}
              <TextInput
                value={duplicateTargets[beverage.id] || ""}
                onChangeText={(value) => setDuplicateTargets((current) => ({ ...current, [beverage.id]: value }))}
                autoCapitalize="none"
                placeholder="Canonical drink ID (for duplicate)"
                placeholderTextColor="rgba(32,26,27,.45)"
                style={styles.duplicateInput}
              />
              <View style={styles.actions}>
                <Pressable disabled={busyId === beverage.id} onPress={() => void updateBeverage(beverage, "active")} style={[styles.action, styles.approve]} accessibilityRole="button" accessibilityLabel={`Publish ${beverage.name}`}><Check size={13} color="#fff" /><Text style={styles.actionLight}>Publish</Text></Pressable>
                <Pressable disabled={busyId === beverage.id} onPress={() => void updateBeverage(beverage, "discontinued")} style={[styles.action, styles.neutral]} accessibilityRole="button" accessibilityLabel={`Mark ${beverage.name} discontinued`}><Text style={styles.actionDark}>Discontinued</Text></Pressable>
                <Pressable disabled={busyId === beverage.id} onPress={() => void updateBeverage(beverage, "duplicate")} style={[styles.action, styles.neutral]} accessibilityRole="button" accessibilityLabel={`Mark ${beverage.name} as duplicate`}><Copy size={13} color={C.ink} /><Text style={styles.actionDark}>Duplicate</Text></Pressable>
                <Pressable disabled={busyId === beverage.id} onPress={() => void updateBeverage(beverage, "archived")} style={[styles.action, styles.reject]} accessibilityRole="button" accessibilityLabel={`Archive ${beverage.name}`}><Text style={styles.actionLight}>Archive</Text></Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 28, paddingBottom: 70, gap: 12 },
  tabs: { flexDirection: "row", alignItems: "center", gap: 7 },
  tab: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,254,248,.64)", borderWidth: 1, borderColor: "rgba(43,73,89,.13)" },
  tabActive: { backgroundColor: C.teal, borderColor: C.teal },
  tabText: { fontFamily: F.bold, fontSize: 11, color: C.teal },
  tabTextActive: { color: "#fff" },
  refresh: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginLeft: "auto", backgroundColor: "rgba(255,254,248,.72)" },
  helper: { fontFamily: F.regular, fontSize: 11, lineHeight: 16, color: "rgba(32,26,27,.68)" },
  error: { fontFamily: F.medium, fontSize: 11, color: C.red },
  card: { padding: 15, borderRadius: 21, gap: 8, backgroundColor: "rgba(255,254,248,.82)", borderWidth: 1, borderColor: "rgba(255,255,255,.72)" },
  empty: { minHeight: 150, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,254,248,.6)" },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  title: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  meta: { marginTop: 2, fontFamily: F.regular, fontSize: 10, color: "rgba(32,26,27,.62)" },
  idText: { fontFamily: F.regular, fontSize: 9, color: "rgba(32,26,27,.45)" },
  duplicateWarning: { fontFamily: F.bold, fontSize: 10, lineHeight: 14, color: C.red },
  status: { overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontFamily: F.bold, fontSize: 9, textTransform: "capitalize", color: C.ink, backgroundColor: "rgba(43,73,89,.09)" },
  status_active: { color: "#087647", backgroundColor: "rgba(4,178,100,.12)" },
  status_draft: { color: C.red, backgroundColor: "rgba(204,36,44,.1)" },
  status_discontinued: { color: "#795600", backgroundColor: "rgba(255,193,7,.16)" },
  status_duplicate: { color: C.teal },
  status_archived: { color: "rgba(32,26,27,.55)" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  action: { minHeight: 34, paddingHorizontal: 11, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  approve: { backgroundColor: C.greenDark },
  reject: { backgroundColor: C.red },
  neutral: { backgroundColor: "rgba(43,73,89,.1)" },
  actionLight: { fontFamily: F.bold, fontSize: 9, color: "#fff" },
  actionDark: { fontFamily: F.bold, fontSize: 9, color: C.ink },
  searchBox: { minHeight: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,254,248,.84)", borderWidth: 1, borderColor: "rgba(43,73,89,.12)" },
  searchInput: { flex: 1, fontFamily: F.regular, fontSize: 13, color: C.ink },
  duplicateInput: { minHeight: 38, borderRadius: 14, paddingHorizontal: 11, fontFamily: F.regular, fontSize: 10, color: C.ink, backgroundColor: "rgba(43,73,89,.05)", borderWidth: 1, borderColor: "rgba(43,73,89,.12)" },
});
