"""Validate Grafana rendering settings and generate Prometheus regression checks."""

import argparse
import itertools
import json
import math
from pathlib import Path


def validate_dashboard(dashboard):
    panels = dashboard["panels"]
    assert len({panel["id"] for panel in panels}) == len(panels), "Duplicate panel IDs"
    for panel in panels:
        position = panel["gridPos"]
        assert 0 <= position["x"] < position["x"] + position["w"] <= 24, panel["title"]
        defaults = panel.get("fieldConfig", {}).get("defaults", {})
        steps = defaults.get("thresholds", {}).get("steps", [])
        previous = -math.inf
        for index, step in enumerate(steps):
            assert isinstance(step["color"], str) and step["color"], (panel["title"], step)
            value = step["value"]
            if index == 0:
                assert value is None, (panel["title"], "First threshold must have a null value")
            else:
                assert type(value) in (int, float) and math.isfinite(value), (panel["title"], step)
                assert value > previous, (panel["title"], "Threshold values must increase")
                previous = value
        if panel["type"] in ("gauge", "bargauge"):
            assert steps, (panel["title"], "Missing thresholds")
            assert panel["options"]["reduceOptions"]["calcs"], panel["title"]
        targets = panel.get("targets", [])
        assert len({target["refId"] for target in targets}) == len(targets), panel["title"]
        for target in targets:
            if target.get("datasource", {}).get("type") == "prometheus":
                assert target["format"] == "time_series", panel["title"]

    for first, second in itertools.combinations(panels, 2):
        a, b = first["gridPos"], second["gridPos"]
        assert (
            a["x"] + a["w"] <= b["x"] or b["x"] + b["w"] <= a["x"]
            or a["y"] + a["h"] <= b["y"] or b["y"] + b["h"] <= a["y"]
        ), ("Overlapping panels", first["title"], second["title"])


def query_checks(panels):
    rules = []
    expressions = {}
    for panel in panels:
        for target in panel.get("targets", []):
            if target.get("datasource", {}).get("type") != "prometheus":
                continue
            expression = target["expr"].replace("$__range", "6h").replace("$__rate_interval", "1m")
            assert "$__" not in expression, expression
            rules.append({"record": f'dashboard_{panel["id"]}_{target["refId"]}', "expr": expression})
            expressions[(panel["id"], target["refId"])] = expression

    def series(labels, values):
        return {"series": labels, "values": values}

    def sample(value, labels="{}"):
        return {"labels": labels, "value": value}

    tests = []

    def case(name, inputs, panel_id, samples, expression=None):
        tests.append({
            "name": name,
            "interval": "1m",
            "input_series": inputs,
            "promql_expr_test": [{
                "expr": expression or expressions[(panel_id, "A")],
                "eval_time": "20m",
                "exp_samples": samples,
            }],
        })

    backend_up = series('up{job="hangover-backend"}', "1x20")
    backend_down = series('up{job="hangover-backend"}', "0x20")
    traffic = series('http_requests_total{job="hangover-backend",method="GET",route="/api/v1/crm-trips/public",status_code="200"}', "0+10x20")
    probe = series('http_requests_total{job="hangover-backend",method="HEAD",route="/api/v1/crm-trips/public",status_code="500"}', "0+5x20")
    case("public uptime", [series('probe_success{job="blackbox-external"}', "1x20")], 3,
         [sample(100, '{job="blackbox-external"}')])
    for panel_id, status in [(9, "401"), (25, "502")]:
        error = series(f'http_requests_total{{job="hangover-backend",method="GET",route="/api/v1/crm-trips/public",status_code="{status}"}}', "0+2x20")
        case(f"{status} zero errors excludes probes", [backend_up, traffic, probe], panel_id, [sample(0)])
        case(f"{status} no traffic uses idle marker", [backend_up, probe], panel_id, [sample(-1)])
        case(f"{status} scrape failure stays missing", [backend_down, traffic, error], panel_id, [])
        case(f"{status} missing scrape target stays missing", [], panel_id, [])
        case(f"{status} error ratio", [backend_up, traffic, error], panel_id, [sample(16.67)],
             f'round({expressions[(panel_id, "A")]}, 0.01)')

    endpoints = [
        (19, "/api/v1/bookings"),
        (19, "/api/v1/crm-trips/public/:id/bookings"),
        (19, "/api/v1/crm-festivals/public/:id/bookings"),
        (20, "/api/v1/payments/verify"),
        (21, "/api/v1/payments/webhook"),
    ]
    for panel_id, route in endpoints:
        counter = series(f'http_requests_total{{job="hangover-backend",method="POST",route="{route}",status_code="200"}}', "0+1x20")
        case(f"{route} idle", [backend_up], panel_id, [sample(0, '{status_code="No requests"}')])
        case(f"{route} active", [backend_up, counter], panel_id, [sample(15, '{status_code="200"}')])
        case(f"{route} down", [backend_down, counter], panel_id, [])

    cadvisor_up = series('up{job="cadvisor"}', "1x20")
    containers = [series(f'container_memory_working_set_bytes{{job="cadvisor",service="{service}"}}', "100x20")
                  for service in ("backend", "postgres")]
    case("missing container labels", [cadvisor_up], 35, [sample(0)])
    case("both containers present", [cadvisor_up, *containers], 35, [sample(2)])
    case("cAdvisor unavailable", [series('up{job="cadvisor"}', "0x20")], 35, [])
    return {"groups": [{"name": "dashboard_queries", "rules": rules}]}, {"tests": tests}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    source = Path(__file__).parent / "grafana/dashboards/hangover-overview.json"
    dashboard = json.loads(source.read_text())
    validate_dashboard(dashboard)
    rules, tests = query_checks(dashboard["panels"])
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "rules.json").write_text(json.dumps(rules, indent=2) + "\n")
    (args.output_dir / "tests.json").write_text(json.dumps(tests, indent=2) + "\n")
    print(f'Validated {len(dashboard["panels"])} panels and generated {len(tests["tests"])} query regression cases.')
