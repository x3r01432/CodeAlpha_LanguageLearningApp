import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { CATEGORIES } from './content';

const STORAGE_KEY = 'languageLearningProgress.v1';
const LESSON_SIZE = 5;
const QUIZ_SIZE = 5;
const emptyProgress = { completed: {}, bestScores: {}, lastDailyDate: null, streak: 0 };

const localKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayKey = () => localKey(new Date());
const dayNumber = () => Math.floor(new Date(todayKey()).getTime() / 86400000);
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const speak = (text) => Speech.speak(text, { language: 'es-ES', rate: 0.85 });

// Lessons: each category's items split into chunks of LESSON_SIZE.
function lessonsFor(cat) {
  const out = [];
  for (let i = 0; i < cat.items.length; i += LESSON_SIZE) {
    out.push({ id: `${cat.id}-${i / LESSON_SIZE + 1}`, title: `${cat.name} ${i / LESSON_SIZE + 1}`, items: cat.items.slice(i, i + LESSON_SIZE) });
  }
  return out;
}
const ALL_LESSONS = CATEGORIES.flatMap(lessonsFor);

// Daily lesson rotates by date: 5 items drawn from all content.
function dailyLesson() {
  const all = CATEGORIES.flatMap((c) => c.items);
  const start = (dayNumber() * LESSON_SIZE) % all.length;
  const items = Array.from({ length: LESSON_SIZE }, (_, i) => all[(start + i) % all.length]);
  return { id: 'daily', title: "Today's Lesson", items };
}

function buildQuiz(items, pool) {
  return shuffle(items).slice(0, QUIZ_SIZE).map((item) => {
    const wrong = shuffle(pool.filter((p) => p.en !== item.en)).slice(0, 3).map((p) => p.en);
    return { prompt: item.es, say: item.say, answer: item.en, options: shuffle([item.en, ...wrong]) };
  });
}

export default function App() {
  const [progress, setProgress] = useState(emptyProgress);
  const [screen, setScreen] = useState({ name: 'home' });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => raw && setProgress({ ...emptyProgress, ...JSON.parse(raw) })).catch(() => {});
  }, []);

  const save = (next) => {
    setProgress(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const completeLesson = (lesson) => {
    const next = { ...progress, completed: { ...progress.completed } };
    if (lesson.id === 'daily') {
      const t = todayKey();
      if (progress.lastDailyDate !== t) {
        const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return localKey(d); })();
        next.streak = progress.lastDailyDate === yesterday ? progress.streak + 1 : 1;
        next.lastDailyDate = t;
      }
    } else {
      next.completed[lesson.id] = true;
    }
    save(next);
  };

  const recordScore = (quizId, score) => {
    if ((progress.bestScores[quizId] ?? -1) >= score) return;
    save({ ...progress, bestScores: { ...progress.bestScores, [quizId]: score } });
  };

  const go = (name, params = {}) => setScreen({ name, ...params });
  let body;
  if (screen.name === 'lesson') body = <Lesson lesson={screen.lesson} onDone={() => { completeLesson(screen.lesson); go('home'); }} onBack={() => go('home')} />;
  else if (screen.name === 'category') body = <Category cat={screen.cat} progress={progress} go={go} />;
  else if (screen.name === 'quiz') body = <Quiz quiz={screen.quiz} onFinish={(s) => recordScore(screen.quiz.id, s)} onBack={() => go('home')} />;
  else if (screen.name === 'progress') body = <Progress progress={progress} onReset={() => save(emptyProgress)} onBack={() => go('home')} />;
  else body = <Home progress={progress} go={go} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>{body}</ScrollView>
    </SafeAreaView>
  );
}

function Button({ title, onPress, kind = 'primary', disabled }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, kind === 'secondary' && styles.btnSecondary, disabled && styles.btnDisabled]}>
      <Text style={[styles.btnText, kind === 'secondary' && styles.btnTextSecondary]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Home({ progress, go }) {
  const doneToday = progress.lastDailyDate === todayKey();
  const allItems = CATEGORIES.flatMap((c) => c.items);
  return (
    <View>
      <Text style={styles.title}>¡Aprende Español! 🇪🇸</Text>
      <Text style={styles.subtitle}>Learn Spanish words, phrases, and sentences</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Today's Lesson {doneToday ? '✅' : ''}</Text>
        <Text style={styles.muted}>A new set of 5 cards every day. Streak: {progress.streak} day(s)</Text>
        <Button title={doneToday ? 'Review again' : 'Start'} onPress={() => go('lesson', { lesson: dailyLesson() })} />
      </View>
      <Text style={styles.section}>Categories</Text>
      {CATEGORIES.map((cat) => {
        const lessons = lessonsFor(cat);
        const done = lessons.filter((l) => progress.completed[l.id]).length;
        return (
          <TouchableOpacity key={cat.id} style={styles.row} onPress={() => go('category', { cat })}>
            <Text style={styles.rowTitle}>{cat.icon}  {cat.name}</Text>
            <Text style={styles.muted}>{done}/{lessons.length} lessons</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.section}>Practice</Text>
      <Button title="🎯 Mixed Practice Test" onPress={() => go('quiz', { quiz: { id: 'mixed', title: 'Mixed Practice Test', questions: buildQuiz(allItems, allItems) } })} />
      <Button title="📊 My Progress" kind="secondary" onPress={() => go('progress')} />
    </View>
  );
}

function Category({ cat, progress, go }) {
  return (
    <View>
      <Button title="← Home" kind="secondary" onPress={() => go('home')} />
      <Text style={styles.title}>{cat.icon} {cat.name}</Text>
      {lessonsFor(cat).map((l) => (
        <TouchableOpacity key={l.id} style={styles.row} onPress={() => go('lesson', { lesson: l })}>
          <Text style={styles.rowTitle}>{l.title} {progress.completed[l.id] ? '✅' : ''}</Text>
          <Text style={styles.muted}>{l.items.length} cards</Text>
        </TouchableOpacity>
      ))}
      <Button
        title={`🎯 ${cat.name} Quiz${progress.bestScores[cat.id] != null ? `  (best ${progress.bestScores[cat.id]}/${QUIZ_SIZE})` : ''}`}
        onPress={() => go('quiz', { quiz: { id: cat.id, title: `${cat.name} Quiz`, questions: buildQuiz(cat.items, cat.items) } })}
      />
    </View>
  );
}

function Lesson({ lesson, onDone, onBack }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const item = lesson.items[i];
  const last = i === lesson.items.length - 1;
  const move = (d) => { setI(i + d); setShow(false); };
  return (
    <View>
      <Button title="← Back" kind="secondary" onPress={onBack} />
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.muted}>Card {i + 1} of {lesson.items.length}</Text>
      <View style={[styles.card, styles.flashcard]}>
        <Text style={styles.spanish}>{item.es}</Text>
        <Text style={styles.pron}>🗣 {item.say}</Text>
        <TouchableOpacity onPress={() => speak(item.es)} style={styles.speakBtn}>
          <Text style={styles.speakText}>🔊 Listen</Text>
        </TouchableOpacity>
        {show ? <Text style={styles.english}>{item.en}</Text> : <Button title="Show Translation" kind="secondary" onPress={() => setShow(true)} />}
      </View>
      <View style={styles.navRow}>
        <View style={styles.flex}><Button title="Previous" kind="secondary" disabled={i === 0} onPress={() => move(-1)} /></View>
        <View style={styles.flex}>{last ? <Button title="Finish ✓" onPress={onDone} /> : <Button title="Next" onPress={() => move(1)} />}</View>
      </View>
    </View>
  );
}

function Quiz({ quiz, onFinish, onBack }) {
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const cur = quiz.questions[q];

  const pick = (opt) => {
    if (picked) return;
    setPicked(opt);
    if (opt === cur.answer) setScore((s) => s + 1);
  };
  const next = () => {
    if (q === quiz.questions.length - 1) {
      setDone(true);
      onFinish(score);
    } else { setQ(q + 1); setPicked(null); }
  };

  if (done) {
    const total = quiz.questions.length;
    return (
      <View>
        <Text style={styles.title}>{quiz.title}</Text>
        <View style={[styles.card, styles.flashcard]}>
          <Text style={styles.spanish}>{score}/{total}</Text>
          <Text style={styles.english}>{score === total ? '¡Perfecto! 🎉' : score >= total / 2 ? '¡Muy bien! 👍' : '¡Sigue practicando! 💪'}</Text>
        </View>
        <Button title="Back to Home" onPress={onBack} />
      </View>
    );
  }
  return (
    <View>
      <Button title="← Quit" kind="secondary" onPress={onBack} />
      <Text style={styles.title}>{quiz.title}</Text>
      <Text style={styles.muted}>Question {q + 1} of {quiz.questions.length} · Score {score}</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>What does this mean?</Text>
        <Text style={styles.spanish}>{cur.prompt}</Text>
        <Text style={styles.pron}>🗣 {cur.say}</Text>
      </View>
      {cur.options.map((opt) => {
        const st = picked && (opt === cur.answer ? styles.correct : opt === picked ? styles.wrong : null);
        return (
          <TouchableOpacity key={opt} style={[styles.option, st]} onPress={() => pick(opt)}>
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
      {picked && <Button title={q === quiz.questions.length - 1 ? 'See Score' : 'Next Question'} onPress={next} />}
    </View>
  );
}

function Progress({ progress, onReset, onBack }) {
  const done = ALL_LESSONS.filter((l) => progress.completed[l.id]).length;
  const quizzes = [...CATEGORIES.map((c) => ({ id: c.id, name: `${c.name} Quiz` })), { id: 'mixed', name: 'Mixed Practice Test' }];
  return (
    <View>
      <Button title="← Home" kind="secondary" onPress={onBack} />
      <Text style={styles.title}>📊 My Progress</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lessons completed: {done}/{ALL_LESSONS.length}</Text>
        <View style={styles.barBg}><View style={[styles.barFill, { width: `${(done / ALL_LESSONS.length) * 100}%` }]} /></View>
        <Text style={styles.muted}>Daily streak: {progress.streak} day(s){progress.lastDailyDate ? ` · last daily lesson ${progress.lastDailyDate}` : ''}</Text>
      </View>
      <Text style={styles.section}>Best quiz scores</Text>
      {quizzes.map((qz) => (
        <View key={qz.id} style={styles.row}>
          <Text style={styles.rowTitle}>{qz.name}</Text>
          <Text style={styles.muted}>{progress.bestScores[qz.id] != null ? `${progress.bestScores[qz.id]}/${QUIZ_SIZE}` : '—'}</Text>
        </View>
      ))}
      <Button title="Reset progress" kind="secondary" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FB', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  container: { padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#1F2A44', marginVertical: 8 },
  subtitle: { fontSize: 15, color: '#5B6475', marginBottom: 16 },
  section: { fontSize: 18, fontWeight: '600', color: '#1F2A44', marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginVertical: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  flashcard: { alignItems: 'center', paddingVertical: 32 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#1F2A44', marginBottom: 4 },
  muted: { color: '#6B7280', fontSize: 14, marginBottom: 6 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1F2A44', flexShrink: 1 },
  btn: { backgroundColor: '#E4572E', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', marginVertical: 6 },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D5DAE3' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  btnTextSecondary: { color: '#1F2A44' },
  spanish: { fontSize: 30, fontWeight: '700', color: '#E4572E', textAlign: 'center', marginVertical: 6 },
  pron: { fontSize: 16, color: '#5B6475', fontStyle: 'italic', marginBottom: 10, textAlign: 'center' },
  english: { fontSize: 20, color: '#1F2A44', textAlign: 'center', marginTop: 10 },
  speakBtn: { backgroundColor: '#FFF1EC', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 18, marginBottom: 14 },
  speakText: { color: '#E4572E', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  option: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 5, borderWidth: 2, borderColor: '#E5E7EB' },
  optionText: { fontSize: 16, color: '#1F2A44' },
  correct: { borderColor: '#22A06B', backgroundColor: '#E8F7F0' },
  wrong: { borderColor: '#E5484D', backgroundColor: '#FDECEC' },
  barBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, marginVertical: 10, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: '#22A06B' },
});
