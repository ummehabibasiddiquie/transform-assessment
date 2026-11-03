export default function CandidateRecordLoading() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-staff-muted">Opening record…</p>
      <h1 className="font-serif text-4xl text-staff-strong">Candidate</h1>
      <p className="text-sm leading-6 text-staff-body">
        Loading this person’s paper and scores. This can take a few seconds the first time.
      </p>
    </div>
  );
}
