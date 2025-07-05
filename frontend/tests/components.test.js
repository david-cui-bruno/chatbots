// Test only the render output, not complex interactions
test('LoadingState renders correctly', () => {
  render(<LoadingState />);
  expect(screen.getByText('Loading your chatbot...')).toBeInTheDocument();
}); 