<?php require __DIR__.'/_data.php'; api_init(); try {
    $q=$_GET; $id=isset($q['id'])?(int)$q['id']:0;
    if ($id) { $u=unit_row($id); if (!$u) api_json(['status'=>'error','message'=>"Storage unit #$id not found"],404); api_json(['status'=>'success','simulated'=>true,'disclaimer'=>'Live Pilot Environment — Simulated Data','data'=>unit_out($u)]); }
    $sql='SELECT * FROM storage_units WHERE 1=1'; $p=[];
    foreach(['state','risk_level','grain_type'] as $k) if(isset($q[$k])&&$q[$k]!==''){ $sql.=" AND $k = ?"; $p[]=trim((string)$q[$k]); }
    if(!empty($q['search'])) {$sql.=' AND (name LIKE ? OR city LIKE ? OR state LIKE ?)'; $s='%'.trim((string)$q['search']).'%'; array_push($p,$s,$s,$s);}
    $sql.=" ORDER BY CASE risk_level WHEN 'critical' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END,id ASC"; $st=db()->prepare($sql);$st->execute($p);$rows=array_map('unit_out',$st->fetchAll());
    api_json(['status'=>'success','count'=>count($rows),'simulated'=>true,'disclaimer'=>'Live Pilot Environment — Simulated Data','data'=>$rows]);
} catch(Throwable $e){api_json(['status'=>'error','message'=>'Internal server error processing storage units query'],500);}
