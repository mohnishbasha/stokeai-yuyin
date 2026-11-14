from yuyin import PACKAGE_NAME


def test_scaffold_package_name_placeholder_matches_project() -> None:
    assert PACKAGE_NAME == "yuyin"
