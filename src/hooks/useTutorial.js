import { useState, useCallback, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase-config";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "has_seen_tutorial";

/**
 * useTutorial - Hook to manage the first-time tutorial state.
 * Syncs with Firestore profiles to persist across devices,
 * with a fallback to localStorage for guests or offline scenarios.
 */
export function useTutorial() {
  const { user, profile, refreshProfile } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if tutorial should be shown
  useEffect(() => {
    const checkTutorialStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Check Firestore (Source of Truth)
        if (profile?.has_seen_tutorial) {
          setShowTutorial(false);
        } else {
          // 2. Fallback to LocalStorage (Useful for quick checks or guest mode)
          const localSeen = localStorage.getItem(`${STORAGE_KEY}_${user.uid}`);
          if (localSeen === "true") {
            setShowTutorial(false);
            // SyncFirestore if not already marked
            if (profile && !profile.has_seen_tutorial) {
              await updateDoc(doc(db, "profiles", user.uid), {
                has_seen_tutorial: true,
              });
            }
          } else {
            setShowTutorial(true);
          }
        }
      } catch (err) {
        console.error("Error checking tutorial status:", err);
        // On error, default to showing if not in local storage
        setShowTutorial(localStorage.getItem(`${STORAGE_KEY}_${user.uid}`) !== "true");
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      checkTutorialStatus();
    }
  }, [user, profile]);

  /** Mark tutorial as completed */
  const completeTutorial = useCallback(async () => {
    setShowTutorial(false);
    if (!user) return;

    try {
      // Persist to LocalStorage
      localStorage.setItem(`${STORAGE_KEY}_${user.uid}`, "true");

      // Persist to Firestore
      const userRef = doc(db, "profiles", user.uid);
      await updateDoc(userRef, {
        has_seen_tutorial: true,
      });
      
      // Refresh context profile
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      console.error("Error completing tutorial:", err);
    }
  }, [user, refreshProfile]);

  /** Manual trigger to start/replay the tutorial */
  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  /** Dismiss and mark as seen so it doesn't reappear */
  const dismissTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  return {
    showTutorial,
    loading,
    startTutorial,
    completeTutorial,
    dismissTutorial,
  };
}
