#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_submit_article() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let article_id = client.submit_article(
        &String::from_str(&env, "Breaking News"),
        &String::from_str(&env, "The world is changing rapidly..."),
        &author,
    );

    assert_eq!(article_id, 1);
    assert_eq!(client.get_article_count(), 1);

    let article = client.get_article(&article_id);
    assert_eq!(article.id, 1);
    assert_eq!(article.title, String::from_str(&env, "Breaking News"));
    assert_eq!(
        article.content,
        String::from_str(&env, "The world is changing rapidly...")
    );
    assert_eq!(article.author, author);
    assert_eq!(article.upvotes, 0);
    assert_eq!(article.downvotes, 0);
}

#[test]
fn test_multiple_articles() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author1 = Address::generate(&env);
    let author2 = Address::generate(&env);

    let id1 = client.submit_article(
        &String::from_str(&env, "Article 1"),
        &String::from_str(&env, "Content 1"),
        &author1,
    );
    let id2 = client.submit_article(
        &String::from_str(&env, "Article 2"),
        &String::from_str(&env, "Content 2"),
        &author2,
    );
    let id3 = client.submit_article(
        &String::from_str(&env, "Article 3"),
        &String::from_str(&env, "Content 3"),
        &author1,
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
    assert_eq!(client.get_article_count(), 3);
}

#[test]
fn test_upvote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "News Article"),
        &String::from_str(&env, "Important content..."),
        &author,
    );

    client.upvote(&article_id, &voter1);
    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 1);
    assert_eq!(article.downvotes, 0);
    assert_eq!(client.get_score(&article_id), 1);

    client.upvote(&article_id, &voter2);
    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 2);
    assert_eq!(client.get_score(&article_id), 2);
}

#[test]
fn test_downvote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Controversial Article"),
        &String::from_str(&env, "Some content..."),
        &author,
    );

    client.downvote(&article_id, &voter1);
    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 0);
    assert_eq!(article.downvotes, 1);
    assert_eq!(client.get_score(&article_id), -1);

    client.downvote(&article_id, &voter2);
    let article = client.get_article(&article_id);
    assert_eq!(article.downvotes, 2);
    assert_eq!(client.get_score(&article_id), -2);
}

#[test]
fn test_mixed_votes() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);
    let voter4 = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Mixed Article"),
        &String::from_str(&env, "Content..."),
        &author,
    );

    client.upvote(&article_id, &voter1);
    client.upvote(&article_id, &voter2);
    client.downvote(&article_id, &voter3);
    client.upvote(&article_id, &voter4);

    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 3);
    assert_eq!(article.downvotes, 1);
    assert_eq!(client.get_score(&article_id), 2);
}

#[test]
#[should_panic(expected = "already upvoted")]
fn test_cannot_upvote_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.upvote(&article_id, &voter);
    client.upvote(&article_id, &voter); // Should panic
}

#[test]
#[should_panic(expected = "already downvoted")]
fn test_cannot_downvote_twice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.downvote(&article_id, &voter);
    client.downvote(&article_id, &voter); // Should panic
}

#[test]
fn test_remove_upvote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.upvote(&article_id, &voter);
    assert_eq!(client.get_score(&article_id), 1);

    client.remove_upvote(&article_id, &voter);
    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 0);
    assert_eq!(client.get_score(&article_id), 0);
}

#[test]
fn test_remove_downvote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.downvote(&article_id, &voter);
    assert_eq!(client.get_score(&article_id), -1);

    client.remove_downvote(&article_id, &voter);
    let article = client.get_article(&article_id);
    assert_eq!(article.downvotes, 0);
    assert_eq!(client.get_score(&article_id), 0);
}

#[test]
#[should_panic(expected = "not upvoted")]
fn test_cannot_remove_upvote_when_not_upvoted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.remove_upvote(&article_id, &voter); // Should panic - never upvoted
}

#[test]
#[should_panic(expected = "not downvoted")]
fn test_cannot_remove_downvote_when_not_downvoted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    client.remove_downvote(&article_id, &voter); // Should panic - never downvoted
}

#[test]
fn test_get_articles_pagination() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);

    // Create 5 articles
    let mut i = 0u32;
    while i < 5 {
        let title = if i == 0 {
            String::from_str(&env, "Article 1")
        } else if i == 1 {
            String::from_str(&env, "Article 2")
        } else if i == 2 {
            String::from_str(&env, "Article 3")
        } else if i == 3 {
            String::from_str(&env, "Article 4")
        } else {
            String::from_str(&env, "Article 5")
        };
        client.submit_article(&title, &String::from_str(&env, "Content"), &author);
        i += 1;
    }

    assert_eq!(client.get_article_count(), 5);

    // Get first page
    let page1 = client.get_articles(&0, &3);
    assert_eq!(page1.len(), 3);

    // Get second page
    let page2 = client.get_articles(&3, &3);
    assert_eq!(page2.len(), 2);

    // Get empty page
    let page3 = client.get_articles(&6, &3);
    assert_eq!(page3.len(), 0);
}

#[test]
fn test_get_top_articles() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    // Article with low score
    let low_id = client.submit_article(
        &String::from_str(&env, "Low Score"),
        &String::from_str(&env, "Content"),
        &author,
    );
    client.downvote(&low_id, &voter);

    // Article with high score
    let high_id = client.submit_article(
        &String::from_str(&env, "High Score"),
        &String::from_str(&env, "Content"),
        &author,
    );
    let v2 = Address::generate(&env);
    let v3 = Address::generate(&env);
    client.upvote(&high_id, &voter);
    client.upvote(&high_id, &v2);
    client.upvote(&high_id, &v3);

    // Article with medium score
    let med_id = client.submit_article(
        &String::from_str(&env, "Medium Score"),
        &String::from_str(&env, "Content"),
        &author,
    );
    client.upvote(&med_id, &voter);

    let top = client.get_top_articles(&0, &3);
    assert_eq!(top.len(), 3);
    assert_eq!(
        top.get(0).unwrap().title,
        String::from_str(&env, "High Score")
    );
    assert_eq!(
        top.get(1).unwrap().title,
        String::from_str(&env, "Medium Score")
    );
    assert_eq!(
        top.get(2).unwrap().title,
        String::from_str(&env, "Low Score")
    );
}

#[test]
fn test_has_voted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    // Initially no votes
    let (has_upvoted, has_downvoted) = client.has_voted(&article_id, &voter);
    assert!(!has_upvoted);
    assert!(!has_downvoted);

    // Upvote
    client.upvote(&article_id, &voter);
    let (has_upvoted, has_downvoted) = client.has_voted(&article_id, &voter);
    assert!(has_upvoted);
    assert!(!has_downvoted);

    // Remove upvote
    client.remove_upvote(&article_id, &voter);
    let (has_upvoted, has_downvoted) = client.has_voted(&article_id, &voter);
    assert!(!has_upvoted);
    assert!(!has_downvoted);

    // Downvote
    client.downvote(&article_id, &voter);
    let (has_upvoted, has_downvoted) = client.has_voted(&article_id, &voter);
    assert!(!has_upvoted);
    assert!(has_downvoted);
}

#[test]
#[should_panic(expected = "article not found")]
fn test_get_nonexistent_article() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    client.get_article(&999); // Should panic
}

#[test]
fn test_anyone_can_submit() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    // Multiple different users can submit articles
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    client.submit_article(
        &String::from_str(&env, "User 1 News"),
        &String::from_str(&env, "Content from user 1"),
        &user1,
    );
    client.submit_article(
        &String::from_str(&env, "User 2 News"),
        &String::from_str(&env, "Content from user 2"),
        &user2,
    );
    client.submit_article(
        &String::from_str(&env, "User 3 News"),
        &String::from_str(&env, "Content from user 3"),
        &user3,
    );

    assert_eq!(client.get_article_count(), 3);
}

#[test]
fn test_anyone_can_vote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(NewsPlatform, ());
    let client = NewsPlatformClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    let voter3 = Address::generate(&env);

    let article_id = client.submit_article(
        &String::from_str(&env, "Article"),
        &String::from_str(&env, "Content"),
        &author,
    );

    // Any user can vote
    client.upvote(&article_id, &voter1);
    client.upvote(&article_id, &voter2);
    client.downvote(&article_id, &voter3);

    let article = client.get_article(&article_id);
    assert_eq!(article.upvotes, 2);
    assert_eq!(article.downvotes, 1);
}
