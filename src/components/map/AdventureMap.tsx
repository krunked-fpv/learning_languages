import type {
  EquippedCosmetics,
  LanguageCourse,
  LanguageProgressState,
  MapNode,
} from '../../types/contracts';

export function AdventureMap({
  course,
  onSelectNode,
}: {
  course: LanguageCourse;
  progress: LanguageProgressState;
  equippedCosmetics: EquippedCosmetics;
  onSelectNode: (node: MapNode) => void;
  onSelectUnit?: (unitIndex: number) => void;
}) {
  return (
    <div data-course={course.language}>
      {course.units.map((u) => (
        <div key={u.id}>
          {u.nodes.map((n) => (
            <button key={n.id} type="button" onClick={() => onSelectNode(n)}>
              {n.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
