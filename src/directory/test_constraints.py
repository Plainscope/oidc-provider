#!/usr/bin/env python3
"""
Test script to verify database CHECK constraints are working correctly.
This script tests that empty or whitespace-only values are rejected.

Usage:
    python test_constraints.py [--db-path /path/to/test.db]
"""
import sqlite3
import os
import argparse
import tempfile
from datetime import datetime


def test_constraints(db_path: str = None):
    """Test that CHECK constraints properly reject invalid data."""
    
    # Use temporary database if no path provided
    if db_path is None:
        temp_dir = tempfile.mkdtemp()
        db_path = os.path.join(temp_dir, 'test_constraints.db')
        print(f"Using temporary database: {db_path}")
    
    print(f"\nTesting CHECK constraints on: {db_path}\n")
    
    # Import database initialization
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from database import Database
    
    # Initialize database
    db_instance = Database(db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    test_results = []
    
    # Test 1: Empty domain name
    print("1. Testing domain with empty name...")
    try:
        cursor.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ('test-domain-1', '')
        )
        conn.commit()
        test_results.append(("Domain empty name", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("Domain empty name", True, "Correctly rejected"))
        else:
            test_results.append(("Domain empty name", False, f"Wrong error: {e}"))
    
    # Test 2: Whitespace-only domain name
    print("2. Testing domain with whitespace-only name...")
    try:
        cursor.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ('test-domain-2', '   ')
        )
        conn.commit()
        test_results.append(("Domain whitespace name", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("Domain whitespace name", True, "Correctly rejected"))
        else:
            test_results.append(("Domain whitespace name", False, f"Wrong error: {e}"))
    
    # Test 3: Valid domain name
    print("3. Testing domain with valid name...")
    try:
        cursor.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ('test-domain-3', 'valid-domain')
        )
        conn.commit()
        test_results.append(("Domain valid name", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("Domain valid name", False, f"Should have been accepted: {e}"))
    
    # Test 4: Empty role name
    print("4. Testing role with empty name...")
    try:
        cursor.execute(
            "INSERT INTO roles (id, name) VALUES (?, ?)",
            ('test-role-1', '')
        )
        conn.commit()
        test_results.append(("Role empty name", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("Role empty name", True, "Correctly rejected"))
        else:
            test_results.append(("Role empty name", False, f"Wrong error: {e}"))
    
    # Test 5: Valid role name
    print("5. Testing role with valid name...")
    try:
        cursor.execute(
            "INSERT INTO roles (id, name) VALUES (?, ?)",
            ('test-role-2', 'admin')
        )
        conn.commit()
        test_results.append(("Role valid name", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("Role valid name", False, f"Should have been accepted: {e}"))
    
    # Test 6: Empty group name
    print("6. Testing group with empty name...")
    try:
        cursor.execute(
            "INSERT INTO groups (id, name, domain_id) VALUES (?, ?, ?)",
            ('test-group-1', '', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("Group empty name", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("Group empty name", True, "Correctly rejected"))
        else:
            test_results.append(("Group empty name", False, f"Wrong error: {e}"))
    
    # Test 7: Valid group name
    print("7. Testing group with valid name...")
    try:
        cursor.execute(
            "INSERT INTO groups (id, name, domain_id) VALUES (?, ?, ?)",
            ('test-group-2', 'engineering', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("Group valid name", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("Group valid name", False, f"Should have been accepted: {e}"))
    
    # Test 8: Empty username
    print("8. Testing user with empty username...")
    try:
        cursor.execute(
            "INSERT INTO users (id, username, password, domain_id) VALUES (?, ?, ?, ?)",
            ('test-user-1', '', 'hashed_password', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("User empty username", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("User empty username", True, "Correctly rejected"))
        else:
            test_results.append(("User empty username", False, f"Wrong error: {e}"))
    
    # Test 9: Empty password
    print("9. Testing user with empty password...")
    try:
        cursor.execute(
            "INSERT INTO users (id, username, password, domain_id) VALUES (?, ?, ?, ?)",
            ('test-user-2', 'testuser', '', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("User empty password", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("User empty password", True, "Correctly rejected"))
        else:
            test_results.append(("User empty password", False, f"Wrong error: {e}"))
    
    # Test 10: Valid user
    print("10. Testing user with valid data...")
    try:
        cursor.execute(
            "INSERT INTO users (id, username, password, domain_id) VALUES (?, ?, ?, ?)",
            ('test-user-3', 'validuser', 'hashed_password', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("User valid data", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("User valid data", False, f"Should have been accepted: {e}"))
    
    # Test 11: Empty email
    print("11. Testing email with empty value...")
    try:
        cursor.execute(
            "INSERT INTO user_emails (id, user_id, email) VALUES (?, ?, ?)",
            ('test-email-1', 'test-user-3', '')
        )
        conn.commit()
        test_results.append(("Email empty value", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "CHECK constraint failed" in str(e):
            test_results.append(("Email empty value", True, "Correctly rejected"))
        else:
            test_results.append(("Email empty value", False, f"Wrong error: {e}"))
    
    # Test 12: Valid email
    print("12. Testing email with valid value...")
    try:
        cursor.execute(
            "INSERT INTO user_emails (id, user_id, email) VALUES (?, ?, ?)",
            ('test-email-2', 'test-user-3', 'user@example.com')
        )
        conn.commit()
        test_results.append(("Email valid value", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("Email valid value", False, f"Should have been accepted: {e}"))
    
    # Test 13: Duplicate group name in same domain (should fail)
    print("13. Testing duplicate group name in same domain...")
    try:
        cursor.execute(
            "INSERT INTO groups (id, name, domain_id) VALUES (?, ?, ?)",
            ('test-group-3', 'engineering', 'test-domain-3')
        )
        conn.commit()
        test_results.append(("Duplicate group in domain", False, "Should have been rejected"))
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            test_results.append(("Duplicate group in domain", True, "Correctly rejected"))
        else:
            test_results.append(("Duplicate group in domain", False, f"Wrong error: {e}"))
    
    # Test 14: Same group name in different domain (should succeed)
    print("14. Testing same group name in different domain...")
    try:
        # Create second domain first
        cursor.execute(
            "INSERT INTO domains (id, name) VALUES (?, ?)",
            ('test-domain-4', 'another-domain')
        )
        cursor.execute(
            "INSERT INTO groups (id, name, domain_id) VALUES (?, ?, ?)",
            ('test-group-4', 'engineering', 'test-domain-4')
        )
        conn.commit()
        test_results.append(("Same group diff domain", True, "Correctly accepted"))
    except sqlite3.IntegrityError as e:
        test_results.append(("Same group diff domain", False, f"Should have been accepted: {e}"))
    
    conn.close()
    
    # Print results
    print("\n" + "=" * 70)
    print("TEST RESULTS")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for test_name, success, message in test_results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status:8} | {test_name:25} | {message}")
        if success:
            passed += 1
        else:
            failed += 1
    
    print("=" * 70)
    print(f"Total: {passed + failed} tests, {passed} passed, {failed} failed")
    print("=" * 70)
    
    if passed > 0:
        print(f"\n✓ {passed} tests passed")
    if failed > 0:
        print(f"✗ {failed} tests failed")
    
    # Cleanup temporary database
    if 'temp_dir' in locals():
        import shutil
        shutil.rmtree(temp_dir)
        print(f"\nCleaned up temporary database")
    
    return failed == 0


def main():
    parser = argparse.ArgumentParser(
        description='Test database CHECK constraints'
    )
    parser.add_argument(
        '--db-path',
        default=None,
        help='Path to test database file (default: creates temporary database)'
    )
    
    args = parser.parse_args()
    
    success = test_constraints(args.db_path)
    
    if success:
        print("\n✓ All constraint tests passed!")
        exit(0)
    else:
        print("\n✗ Some constraint tests failed!")
        exit(1)


if __name__ == '__main__':
    main()
