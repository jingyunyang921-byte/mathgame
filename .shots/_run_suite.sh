#!/usr/bin/env bash
# QA runner: execute all LOCAL (:9333) verify scripts sequentially, collect pass/fail.
cd "$(dirname "$0")/.." || exit 1
SCRIPTS=(
  verify_travel_static.mjs verify_fourops.mjs sim_repeat.mjs
  verify_game_dynamic.mjs verify_game_l2.mjs verify_game_l3.mjs verify_game_l4.mjs
  verify_levels_migration.mjs
  verify_monster_timer.mjs verify_shadow_speed.mjs
  verify_gate_finale.mjs verify_sail.mjs
  verify_result.mjs verify_rankup.mjs verify_practice.mjs verify_weak.mjs
  verify_sprint_daily.mjs verify_combo.mjs verify_countdown.mjs
  verify_overlay_stats.mjs verify_profile_modal.mjs verify_pet_care.mjs verify_gift_story_rules.mjs verify_gift_story_audio.mjs verify_gift_story.mjs verify_picture_story.mjs verify_pet.mjs verify_chest.mjs verify_chest_claim.mjs verify_chest_stage.mjs verify_energy_xp.mjs verify_chest_layout.mjs verify_travel_result_layout.mjs verify_pet_learning.mjs
  verify_mistakes.mjs verify_wronglog.mjs verify_review.mjs verify_collection.mjs verify_badges.mjs verify_confirm_modal.mjs verify_exit_direct.mjs
  verify_menu.mjs verify_menu_map.mjs verify_race_autumn.mjs verify_scenes_l123.mjs verify_pk_map.mjs verify_deai_pk.mjs verify_deai_race_boss.mjs verify_story.mjs verify_daily.mjs
  verify_polish.mjs verify_listen_card.mjs verify_listen_hero.mjs verify_listen_stage.mjs verify_listen_fill.mjs verify_skip_inline.mjs
  verify_voice_heard.mjs verify_heard_display.mjs verify_voice_listen_cue.mjs verify_p3_12_14.mjs
  verify_bugfix_batch.mjs verify_intro_tts.mjs verify_kid_sprite.mjs verify_materials.mjs verify_nest_preschool.mjs verify_result_center.mjs
  verify_pk_kid.mjs verify_egg_companion.mjs verify_egg_stage.mjs verify_scene_names.mjs verify_guide_rules.mjs verify_scheme_a.mjs verify_egg_interact.mjs verify_pet_footer_pinned.mjs verify_pet_shop.mjs verify_egg_align.mjs verify_pet_items.mjs verify_perf_pass.mjs verify_game_static.mjs verify_a11y_menu.mjs verify_win_scene.mjs
  verify_checkin_card.mjs verify_record_chase.mjs verify_victory_beat.mjs verify_sprint_tier.mjs verify_fresh_install.mjs verify_adopt_guide.mjs verify_l6_buddy.mjs verify_levels_exclusive.mjs verify_stage_merge.mjs verify_bingo_queue.mjs verify_idle_hint.mjs verify_focus_bgm.mjs verify_tts_prefetch.mjs verify_preread_guide.mjs verify_poke_interact.mjs verify_bg_pause.mjs verify_visual_idle.mjs
)
CDP="${CDP:-http://localhost:9333}"
# Reclaim leaked page targets before the run and after each script. Own-target
# scripts (Target.createTarget, never Target.closeTarget) leak ~38 game tabs over a
# full run; accumulation starved the browser and timed out the shared-page scripts
# (verify_fourops/pace/combo/... grab info.find(page) instead of their own target).
# KEEP exactly one stable, warm page tab (the first target) and close the rest:
# closing EVERY tab and recreating a fresh one each time forced the shared-page
# scripts to adopt a cold just-created tab mid-run and raced their navigate/reload/
# poll boot. Only recreate when there is no survivor or the survivor is non-http
# (about:blank swaps renderer process on first http nav and drops the WS, exit 13).
# All curls done in node (fetch); /json/new needs PUT on this Chrome.
purge() {
  node -e '
    const CDP = process.argv[1];
    (async () => { try {
      const a = (await (await fetch(CDP + "/json")).json()).filter(t => t.type === "page");
      const keep = a[0];
      for (const t of a.slice(1)) await fetch(CDP + "/json/close/" + t.id).catch(() => {});
      const mk = () => fetch(CDP + "/json/new?http://localhost:8000/index.html", { method: "PUT" }).catch(() => {});
      if (!keep) { await mk(); return; }
      if (!/^https?:/.test(keep.url || "")) { await mk(); await fetch(CDP + "/json/close/" + keep.id).catch(() => {}); }
    } catch (e) {} })();
  ' "$CDP" 2>/dev/null
}
pass=0; fail=0; err=0
purge
echo "RUN_START $(date +%H:%M:%S)"
for s in "${SCRIPTS[@]}"; do
  [ -f ".shots/$s" ] || { echo "MISS  $s"; continue; }
  out=$(timeout 420 node ".shots/$s" 2>&1); code=$?
  # last non-empty line = summary
  last=$(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | tail -1)
  nf=$(printf '%s\n' "$out" | grep -c '^FAIL')
  if [ $code -eq 124 ]; then echo "TIMEOUT  $s"; err=$((err+1));
  elif [ $code -eq 0 ]; then echo "OK    $s  :: $last"; pass=$((pass+1));
  else echo "FAIL($code) $s  (FAILlines=$nf) :: $last"; fail=$((fail+1)); fi
  purge
done
echo "RUN_END $(date +%H:%M:%S)  pass=$pass fail=$fail err=$err total=${#SCRIPTS[@]}"
