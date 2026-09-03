//! Tests for step m7-01-wordstat. Run: `cargo test --test m7-01-wordstat`
use rust_foundations::project::wordstat::{WordstatError, count_words, normalize, report, run};

mod m7_01_wordstat {
    use super::*;

    #[test]
    fn normalize_strips_punctuation_and_lowercases() {
        assert_eq!(normalize("Fox,"), Some(String::from("fox")));
        assert_eq!(normalize("\"Hello!\""), Some(String::from("hello")));
        assert_eq!(normalize("don't"), Some(String::from("don't")));
        assert_eq!(normalize("--"), None);
        assert_eq!(normalize(""), None);
        assert_eq!(normalize("42"), Some(String::from("42")));
    }

    #[test]
    fn count_words_uses_normalized_words() {
        let counts = count_words("The fox. THE Fox, the dog!");
        assert_eq!(counts.get("the"), Some(&3));
        assert_eq!(counts.get("fox"), Some(&2));
        assert_eq!(counts.get("dog"), Some(&1));
        assert_eq!(counts.len(), 3);
    }

    #[test]
    fn report_counts_and_ranks() {
        let r = report("the fox the dog the cat", 2);
        assert_eq!(r.total_words, 6);
        assert_eq!(r.unique_words, 4);
        assert_eq!(
            r.top,
            vec![(String::from("the"), 3), (String::from("cat"), 1)]
        );
    }

    #[test]
    fn report_with_zero_top_is_still_counted() {
        let r = report("a b a", 0);
        assert_eq!(r.total_words, 3);
        assert_eq!(r.unique_words, 2);
        assert!(r.top.is_empty());
    }

    #[test]
    fn report_display_is_aligned() {
        let r = report("the fox the", 2);
        assert_eq!(r.to_string(), "words: 3\nunique: 2\n  2  the\n  1  fox\n");
    }

    #[test]
    fn run_reads_the_sample_file() {
        let r = run("samples/fox.txt", 3).expect("samples/fox.txt should be readable");
        // 25 whitespace-separated tokens, but "--" normalizes to None.
        assert_eq!(r.total_words, 24);
        assert_eq!(r.unique_words, 12);
        assert_eq!(r.top[0], (String::from("the"), 7));
        assert_eq!(r.top[1], (String::from("fox"), 4));
        assert_eq!(r.top[2], (String::from("dog"), 3));
    }

    #[test]
    fn run_reports_a_missing_file_as_io() {
        match run("samples/does-not-exist.txt", 3) {
            Err(WordstatError::Io(_)) => {}
            other => panic!("expected Io error, got {other:?}"),
        }
    }

    #[test]
    fn run_reports_an_empty_file_as_no_words() {
        let path = std::env::temp_dir().join("rust-foundations-empty.txt");
        std::fs::write(&path, "   \n\n -- \n").expect("temp file");
        match run(path.to_str().expect("utf-8 path"), 3) {
            Err(WordstatError::NoWords) => {}
            other => panic!("expected NoWords, got {other:?}"),
        }
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn wordstat_error_displays() {
        assert_eq!(
            WordstatError::NoWords.to_string(),
            "the file contains no words"
        );
    }
}
